import ExpenseTrackerKit
import SwiftUI

struct WalletFormView: View {
    /// nil to create a new wallet.
    let wallet: Wallet?

    @Environment(DataStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var kind: WalletKind
    @State private var currency: String
    @State private var balanceText: String
    @State private var errorMessage: String?

    init(wallet: Wallet?) {
        self.wallet = wallet
        _name = State(initialValue: wallet?.name ?? "")
        _kind = State(initialValue: wallet?.kind ?? .cash)
        _currency = State(initialValue: wallet?.currency ?? "USD")
        _balanceText = State(initialValue: wallet.map { MoneyFormat.editableString($0.balance, currency: $0.currency) } ?? "")
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
                Section {
                    TextField("Wallet name (e.g. ABA Bank, Cash)", text: $name)
                        .textInputAutocapitalization(.words)
                    Picker("Type", selection: $kind) {
                        ForEach(WalletKind.allCases) { k in
                            Text("\(k.emoji) \(k.label)").tag(k)
                        }
                    }
                    Picker("Currency", selection: $currency) {
                        ForEach(Currencies.all) { c in
                            Text("\(c.symbol) \(c.code) — \(c.name)").tag(c.code)
                        }
                    }
                }
                Section {
                    HStack {
                        Text(Currencies.symbol(for: currency)).foregroundStyle(.secondary)
                        TextField(currency == "KHR" ? "0" : "0.00", text: $balanceText)
                            .keyboardType(.decimalPad)
                            .font(.title3.monospacedDigit())
                    }
                } header: {
                    Text(wallet == nil ? "Initial Balance" : "Balance")
                } footer: {
                    if wallet != nil {
                        Text("Changing the balance here doesn't record a transaction. Use Adjust Balance to keep a record.")
                    }
                }
            }
            .navigationTitle(wallet == nil ? "New Wallet" : "Edit Wallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(wallet == nil ? "Create" : "Save") { save() }
                }
            }
        }
    }

    private func save() {
        let balance: Double
        if balanceText.trimmingCharacters(in: .whitespaces).isEmpty {
            balance = 0
        } else if let parsed = MoneyFormat.parseNumber(balanceText), parsed >= 0 {
            balance = parsed
        } else {
            errorMessage = "Enter a balance of 0 or more."
            return
        }

        var updated = wallet ?? Wallet(name: "", balance: 0, currency: currency)
        updated.name = name.trimmingCharacters(in: .whitespaces)
        updated.type = kind.rawValue
        updated.currency = currency
        updated.balance = balance
        updated.exchangeRate = Currencies.info(for: currency)?.fallbackRate ?? 1

        let problem: String?
        if let wallet {
            problem = store.updateWallet(original: wallet, to: updated)
        } else {
            problem = store.addWallet(updated)
        }
        if let problem {
            errorMessage = problem
        } else {
            Haptics.success()
            dismiss()
        }
    }
}

struct BalanceAdjustmentView: View {
    let wallet: Wallet

    @Environment(DataStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var direction = Ledger.Adjustment.add
    @State private var amountText = ""
    @State private var reason = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("Current balance", value: MoneyFormat.string(wallet.balance, currency: wallet.currency))
                }
                if let errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Theme.expense)
                    }
                }
                Section {
                    Picker("Adjustment", selection: $direction) {
                        Text("Add Money").tag(Ledger.Adjustment.add)
                        Text("Subtract Money").tag(Ledger.Adjustment.subtract)
                    }
                    .pickerStyle(.segmented)
                    HStack {
                        Text(Currencies.symbol(for: wallet.currency)).foregroundStyle(.secondary)
                        TextField(wallet.currency == "KHR" ? "0" : "0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .font(.title3.monospacedDigit())
                    }
                    TextField("Reason (e.g. Salary deposit, ATM withdrawal)", text: $reason, axis: .vertical)
                        .lineLimit(1...3)
                } footer: {
                    Text("With a reason, the adjustment is also recorded as \(direction == .add ? "income" : "an expense").")
                }
            }
            .navigationTitle("Adjust \(wallet.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirm") {
                        guard let amount = MoneyFormat.parseAmount(amountText) else {
                            errorMessage = "Enter an amount greater than 0."
                            return
                        }
                        store.adjustBalance(of: wallet, amount: amount, direction: direction, reason: reason)
                        Haptics.success()
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
