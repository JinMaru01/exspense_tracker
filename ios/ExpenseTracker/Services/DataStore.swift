import ExpenseTrackerKit
import FirebaseFirestore
import Observation

/// Live view of `users/{uid}` in Firestore plus every write the app makes — the Swift
/// counterpart of hooks/use-firebase-data.ts, reading and writing the same documents.
///
/// Writes go through the Firestore SDK's offline cache: listeners see them immediately and
/// they sync when the network is back, so methods validate synchronously (returning an error
/// message or nil) and commit in the background. Commit failures land in `syncError`.
/// Balances change through atomic increments so edits made at the same time on the web
/// and on the phone don't overwrite each other.
@MainActor
@Observable
final class DataStore {
    let uid: String

    /// Newest first.
    private(set) var expenses: [Expense] = []
    private(set) var wallets: [Wallet] = []
    private(set) var subscriptions: [SubscriptionPlan] = []
    /// True once both expenses and wallets have arrived (from cache or server).
    private(set) var isLoaded = false
    var syncError: String?

    private let db = Firestore.firestore()
    @ObservationIgnored private var listeners: [ListenerRegistration] = []
    @ObservationIgnored private var expensesLoaded = false
    @ObservationIgnored private var walletsLoaded = false

    /// Firestore allows 500 writes per batch.
    private static let batchLimit = 450

    init(uid: String) {
        self.uid = uid
    }

    // MARK: - Listening

    func start() {
        guard listeners.isEmpty else { return }
        listeners = [
            listen("expenses", decode: Expense.init(id:fields:)) { store, docs in
                store.expenses = docs.sorted { $0.date > $1.date }
                store.expensesLoaded = true
            },
            listen("wallets", decode: Wallet.init(id:fields:)) { store, docs in
                store.wallets = docs.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
                store.walletsLoaded = true
            },
            listen("subscriptions", decode: SubscriptionPlan.init(id:fields:)) { store, docs in
                store.subscriptions = docs
            },
        ]
    }

    func stop() {
        listeners.forEach { $0.remove() }
        listeners = []
    }

    private func listen<T>(
        _ name: String,
        decode: @escaping (String, [String: Any]) -> T,
        apply: @escaping (DataStore, [T]) -> Void
    ) -> ListenerRegistration {
        collection(name).addSnapshotListener { [weak self] snapshot, error in
            let docs = snapshot?.documents.map { decode($0.documentID, Self.plainFields($0.data())) }
            let message = error?.localizedDescription
            Task { @MainActor in
                guard let self else { return }
                if let docs { apply(self, docs) }
                if let message {
                    self.syncError = message
                    // Don't leave the user on the loading screen if access is denied.
                    self.expensesLoaded = true
                    self.walletsLoaded = true
                }
                self.isLoaded = self.expensesLoaded && self.walletsLoaded
            }
        }
    }

    /// Firestore hands back `Timestamp`s; the model layer works with `Date`.
    nonisolated private static func plainFields(_ fields: [String: Any]) -> [String: Any] {
        fields.mapValues { value -> Any in
            if let timestamp = value as? Timestamp { return timestamp.dateValue() }
            return value
        }
    }

    // MARK: - Lookups

    func wallet(named name: String) -> Wallet? {
        wallets.first { $0.name == name }
    }

    func wallet(id: String) -> Wallet? {
        wallets.first { $0.id == id }
    }

    func entries(for wallet: Wallet) -> [Expense] {
        expenses.filter { $0.wallet == wallet.name || $0.toWallet == wallet.name }
    }

    var overdueSubscriptionCount: Int {
        subscriptions.filter { SubscriptionMath.needsAttention($0) }.count
    }

    // MARK: - Transactions

    func addExpense(_ entry: Expense) -> String? {
        guard let wallet = self.wallet(named: entry.wallet) else { return "Wallet not found." }
        if let problem = Ledger.validateSpend(amount: entry.amount, from: wallet) { return problem }
        var entry = entry
        entry.type = .expense
        let batch = db.batch()
        batch.setData(entry.firestoreFields, forDocument: collection("expenses").document())
        applyBalanceChanges(Ledger.effects(of: entry), in: batch)
        commit(batch)
        return nil
    }

    func addIncome(_ entry: Expense) -> String? {
        guard wallet(named: entry.wallet) != nil else { return "Wallet not found." }
        var entry = entry
        entry.type = .income
        if entry.note.trimmingCharacters(in: .whitespaces).isEmpty { entry.note = "Income" }
        let batch = db.batch()
        batch.setData(entry.firestoreFields, forDocument: collection("expenses").document())
        applyBalanceChanges(Ledger.effects(of: entry), in: batch)
        commit(batch)
        return nil
    }

    func updateExpense(original: Expense, to updated: Expense) -> String? {
        if updated.type == .expense {
            guard let target = self.wallet(named: updated.wallet) else { return "Wallet not found." }
            if let problem = Ledger.validateSpend(amount: updated.amount, from: target, replacing: original) {
                return problem
            }
        }
        let batch = db.batch()
        batch.updateData(updated.firestoreFields, forDocument: collection("expenses").document(original.id))
        applyBalanceChanges(Ledger.deltas(replacing: original, with: updated), in: batch)
        commit(batch)
        return nil
    }

    func deleteExpense(_ entry: Expense) {
        let batch = db.batch()
        batch.deleteDocument(collection("expenses").document(entry.id))
        applyBalanceChanges(Ledger.reversal(of: entry), in: batch)
        commit(batch)
    }

    /// Adds imported records as-is. Like the web importer, this doesn't touch wallet balances.
    func importEntries(_ entries: [Expense]) {
        let ref = collection("expenses")
        commitInChunks(entries.map { entry -> (WriteBatch) -> Void in
            { batch in batch.setData(entry.firestoreFields, forDocument: ref.document()) }
        })
    }

    // MARK: - Wallets

    func addWallet(_ wallet: Wallet) -> String? {
        if let problem = validateWalletName(wallet.name, excluding: nil) { return problem }
        collection("wallets").addDocument(data: wallet.firestoreFields, completion: report)
        return nil
    }

    /// Saves wallet edits. Entries and subscriptions refer to wallets by name, so a rename is
    /// carried over to them in the same write.
    func updateWallet(original: Wallet, to updated: Wallet) -> String? {
        if let problem = validateWalletName(updated.name, excluding: original.id) { return problem }
        var writes: [(WriteBatch) -> Void] = []
        let walletRef = collection("wallets").document(original.id)
        writes.append { $0.setData(updated.firestoreFields, forDocument: walletRef) }

        if original.name != updated.name {
            for entry in expenses where entry.wallet == original.name || entry.toWallet == original.name {
                var fields: [String: Any] = [:]
                if entry.wallet == original.name { fields["wallet"] = updated.name }
                if entry.toWallet == original.name { fields["toWallet"] = updated.name }
                let ref = collection("expenses").document(entry.id)
                writes.append { $0.updateData(fields, forDocument: ref) }
            }
            for plan in subscriptions where plan.wallet == original.name {
                let ref = collection("subscriptions").document(plan.id)
                writes.append { $0.updateData(["wallet": updated.name], forDocument: ref) }
            }
        }
        commitInChunks(writes)
        return nil
    }

    func setLocked(_ wallet: Wallet, _ locked: Bool) {
        collection("wallets").document(wallet.id).updateData(["locked": locked], completion: report)
    }

    func canDelete(_ wallet: Wallet) -> Bool {
        !expenses.contains { $0.wallet == wallet.name || $0.toWallet == wallet.name }
    }

    func deleteWallet(_ wallet: Wallet) -> String? {
        guard canDelete(wallet) else { return "This wallet has transactions and cannot be deleted." }
        collection("wallets").document(wallet.id).delete(completion: report)
        return nil
    }

    func adjustBalance(of wallet: Wallet, amount: Double, direction: Ledger.Adjustment, reason: String) {
        let (entry, delta) = Ledger.adjustment(of: wallet, amount: amount, direction: direction, reason: reason, date: Date())
        let batch = db.batch()
        batch.updateData(["balance": FieldValue.increment(delta)], forDocument: collection("wallets").document(wallet.id))
        if let entry {
            batch.setData(entry.firestoreFields, forDocument: collection("expenses").document())
        }
        commit(batch)
    }

    func transfer(from: Wallet, to: Wallet, amount: Double, convertedAmount: Double, note: String) -> String? {
        // Validate against the latest balances, not the ones the form was opened with.
        let source = self.wallet(id: from.id)
        let destination = self.wallet(id: to.id)
        if let problem = Ledger.validateTransfer(from: source, to: destination, amount: amount) { return problem }
        guard let source, let destination else { return "Wallet not found." }
        let entry = Ledger.transferEntry(
            from: source, to: destination, amount: amount, convertedAmount: convertedAmount, note: note, date: Date()
        )
        let batch = db.batch()
        batch.setData(entry.firestoreFields, forDocument: collection("expenses").document())
        applyBalanceChanges(Ledger.effects(of: entry), in: batch)
        commit(batch)
        return nil
    }

    private func validateWalletName(_ name: String, excluding id: String?) -> String? {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return "Enter a name." }
        if wallets.contains(where: { $0.id != id && $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            return "A wallet named \"\(trimmed)\" already exists."
        }
        return nil
    }

    // MARK: - Subscriptions

    func addSubscription(_ plan: SubscriptionPlan) {
        collection("subscriptions").addDocument(data: plan.firestoreFields, completion: report)
    }

    func updateSubscription(_ plan: SubscriptionPlan) {
        collection("subscriptions").document(plan.id).setData(plan.firestoreFields, completion: report)
    }

    func setActive(_ plan: SubscriptionPlan, _ active: Bool) {
        collection("subscriptions").document(plan.id).updateData(["active": active], completion: report)
    }

    func deleteSubscription(_ plan: SubscriptionPlan) {
        collection("subscriptions").document(plan.id).delete(completion: report)
    }

    /// Records the charge as an expense, takes it from the wallet and moves the due date on one cycle.
    func charge(_ plan: SubscriptionPlan) -> String? {
        let wallet = self.wallet(named: plan.wallet)
        if let problem = SubscriptionMath.validateCharge(plan, wallet: wallet) { return problem }
        guard let wallet else { return nil }
        let entry = SubscriptionMath.chargeEntry(for: plan, date: Date())
        let batch = db.batch()
        batch.setData(entry.firestoreFields, forDocument: collection("expenses").document())
        batch.updateData(["balance": FieldValue.increment(-plan.amount)], forDocument: collection("wallets").document(wallet.id))
        batch.updateData(["nextDate": plan.cycle.advance(plan.nextDate)], forDocument: collection("subscriptions").document(plan.id))
        commit(batch)
        return nil
    }

    // MARK: - Everything

    func clearAllData() {
        var writes: [(WriteBatch) -> Void] = []
        for (name, ids) in [("expenses", expenses.map(\.id)), ("wallets", wallets.map(\.id)), ("subscriptions", subscriptions.map(\.id))] {
            let col = collection(name)
            writes += ids.map { id -> (WriteBatch) -> Void in
                { batch in batch.deleteDocument(col.document(id)) }
            }
        }
        commitInChunks(writes)
    }

    // MARK: - Plumbing

    private func collection(_ name: String) -> CollectionReference {
        db.collection("users").document(uid).collection(name)
    }

    private func applyBalanceChanges(_ deltas: [String: Double], in batch: WriteBatch) {
        for (name, delta) in deltas where abs(delta) > 1e-9 {
            guard let wallet = self.wallet(named: name) else { continue }
            batch.updateData(["balance": FieldValue.increment(delta)], forDocument: collection("wallets").document(wallet.id))
        }
    }

    private func commit(_ batch: WriteBatch) {
        batch.commit(completion: report)
    }

    private func commitInChunks(_ writes: [(WriteBatch) -> Void]) {
        for start in stride(from: 0, to: writes.count, by: Self.batchLimit) {
            let batch = db.batch()
            writes[start..<min(start + Self.batchLimit, writes.count)].forEach { $0(batch) }
            commit(batch)
        }
    }

    private var report: (Error?) -> Void {
        { [weak self] error in
            guard let message = error?.localizedDescription else { return }
            Task { @MainActor in self?.syncError = message }
        }
    }
}
