import ExpenseTrackerKit
import SwiftUI

/// Add an expense or income, or edit any existing entry.
struct EntryFormView: View {
    enum Mode {
        case add(EntryType)
        case edit(Expense)
    }

    let mode: Mode

    @Environment(DataStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var walletName = ""
    @State private var amountText = ""
    @State private var category = ""
    @State private var date = Date()
    @State private var note = ""
    @State private var errorMessage: String?
    @State private var confirmingLockedWallet = false
    @FocusState private var amountFocused: Bool

    init(mode: Mode) {
        self.mode = mode
        if case let .edit(entry) = mode {
            _walletName = State(initialValue: entry.wallet)
            _amountText = State(initialValue: MoneyFormat.editableString(entry.amount, currency: entry.currency))
            _category = State(initialValue: entry.category)
            _date = State(initialValue: entry.date)
            _note = State(initialValue: entry.note)
        }
    }

    private var original: Expense? {
        if case let .edit(entry) = mode { return entry }
        return nil
    }

    private var type: EntryType {
        switch mode {
        case let .add(type): type
        case let .edit(entry): entry.type
        }
    }

    private var title: String {
        switch mode {
        case .add(.income): "Add Income"
        case .add: "Add Expense"
        case .edit: "Edit \(type.label)"
        }
    }

    private var selectedWallet: Wallet? { store.wallet(named: walletName) }

    private var categoryOptions: [CategoryInfo] {
        var options = type == .income ? Categories.income : Categories.expense
        // Keep an imported or legacy category selectable when editing.
        if !category.isEmpty, !options.contains(where: { $0.name == category }) {
            options.insert(Categories.named(category), at: 0)
        }
        return options
    }

    var body: some View {
        NavigationStack {
            Form {
                if let errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Theme.expense)
                    }
                }

                if type == .transfer, let original {
                    transferSummary(original)
                } else {
                    walletAndAmount
                    Section {
                        Picker("Category", selection: $category) {
                            if category.isEmpty {
                                Text("Select").tag("")
                            }
                            ForEach(categoryOptions) { c in
                                Text("\(c.icon) \(c.name)").tag(c.name)
                            }
                        }
                    }
                }

                Section {
                    DatePicker("Date", selection: $date, in: ...Date(), displayedComponents: .date)
                    TextField(type == .income ? "Description (e.g. October salary)" : "Description", text: $note, axis: .vertical)
                        .lineLimit(1...4)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(original == nil ? "Add" : "Save") { submit() }
                }
            }
            .alert("Locked wallet", isPresented: $confirmingLockedWallet) {
                Button("Proceed") { save() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("\"\(walletName)\" is locked. Are you sure you want to proceed with this transaction?")
            }
            .onAppear {
                if walletName.isEmpty, store.wallets.count == 1 {
                    walletName = store.wallets[0].name
                }
                if original == nil { amountFocused = true }
            }
        }
    }

    private var walletAndAmount: some View {
        Section {
            Picker(type == .income ? "Deposit to" : "Wallet", selection: $walletName) {
                if walletName.isEmpty {
                    Text("Select").tag("")
                }
                ForEach(store.wallets) { w in
                    Text("\(w.name) — \(MoneyFormat.string(w.balance, currency: w.currency))").tag(w.name)
                }
            }
            HStack {
                Text(Currencies.symbol(for: selectedWallet?.currency ?? "USD"))
                    .foregroundStyle(.secondary)
                TextField(selectedWallet?.currency == "KHR" ? "0" : "0.00", text: $amountText)
                    .keyboardType(.decimalPad)
                    .focused($amountFocused)
                    .font(.title3.monospacedDigit())
            }
        } footer: {
            if store.wallets.isEmpty {
                Text("Create a wallet first in the Wallets tab.")
            } else if let wallet = selectedWallet {
                let available = Ledger.available(in: wallet, excluding: original)
                Text("Available: \(MoneyFormat.string(available, currency: wallet.currency))\(wallet.locked ? " · 🔒 Locked" : "")")
            }
        }
    }

    private func transferSummary(_ entry: Expense) -> some View {
        Section {
            LabeledContent("From", value: entry.wallet)
            LabeledContent("To", value: entry.toWallet ?? "—")
            LabeledContent("Amount", value: MoneyFormat.string(entry.amount, currency: entry.currency))
            if let received = entry.convertedAmount, let to = entry.toWallet {
                LabeledContent("Received", value: MoneyFormat.string(received, currency: store.wallet(named: to)?.currency ?? entry.currency))
            }
        } footer: {
            Text("To change wallets or amounts, delete this transfer and make a new one.")
        }
    }

    private func submit() {
        errorMessage = nil
        if type == .transfer {
            save()
            return
        }
        guard let wallet = selectedWallet else {
            errorMessage = "Select a wallet."
            return
        }
        guard let amount = MoneyFormat.parseAmount(amountText) else {
            errorMessage = "Enter an amount greater than 0."
            return
        }
        guard !category.isEmpty else {
            errorMessage = "Select a category."
            return
        }
        if type == .expense, let problem = Ledger.validateSpend(amount: amount, from: wallet, replacing: original) {
            errorMessage = problem
            return
        }
        if wallet.locked {
            confirmingLockedWallet = true
        } else {
            save()
        }
    }

    private func save() {
        let trimmedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let result: String?

        if let original, original.type == .transfer {
            var updated = original
            updated.note = trimmedNote
            updated.date = date
            result = store.updateExpense(original: original, to: updated)
        } else {
            guard let wallet = selectedWallet, let amount = MoneyFormat.parseAmount(amountText) else { return }
            let entry = Expense(
                id: original?.id ?? "",
                amount: amount,
                category: category,
                wallet: wallet.name,
                note: trimmedNote,
                date: date,
                currency: wallet.currency,
                type: type
            )
            switch mode {
            case .add(.income): result = store.addIncome(entry)
            case .add: result = store.addExpense(entry)
            case let .edit(original): result = store.updateExpense(original: original, to: entry)
            }
        }

        if let result {
            errorMessage = result
            Haptics.warning()
        } else {
            Haptics.success()
            dismiss()
        }
    }
}
