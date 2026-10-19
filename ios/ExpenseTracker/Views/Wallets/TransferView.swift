import ExpenseTrackerKit
import SwiftUI

/// Move money between wallets, converting at the live rate when currencies differ.
struct TransferView: View {
    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @Environment(\.dismiss) private var dismiss

    @State private var fromID: String
    @State private var toID = ""
    @State private var amountText = ""
    @State private var note = ""
    @State private var errorMessage: String?
    @State private var confirmingLockedWallet = false

    init(fromWalletID: String? = nil) {
        _fromID = State(initialValue: fromWalletID ?? "")
    }

    private var from: Wallet? { store.wallet(id: fromID) }
    private var to: Wallet? { store.wallet(id: toID) }
    private var amount: Double? { MoneyFormat.parseAmount(amountText) }

    private var converted: Double? {
        guard let amount, let from, let to else { return nil }
        return rates.rates.convert(amount, from: from.currency, to: to.currency)
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
                    Picker("From", selection: $fromID) {
                        if fromID.isEmpty { Text("Select").tag("") }
                        ForEach(store.wallets) { w in
                            Text("\(w.name) — \(MoneyFormat.string(w.balance, currency: w.currency))").tag(w.id)
                        }
                    }
                    Picker("To", selection: $toID) {
                        if toID.isEmpty { Text("Select").tag("") }
                        ForEach(store.wallets.filter { $0.id != fromID }) { w in
                            Text("\(w.name) — \(MoneyFormat.string(w.balance, currency: w.currency))").tag(w.id)
                        }
                    }
                } footer: {
                    if let from {
                        Text("Available: \(MoneyFormat.string(from.balance, currency: from.currency))\(from.locked ? " · 🔒 Locked" : "")")
                    }
                }

                Section {
                    HStack {
                        Text(Currencies.symbol(for: from?.currency ?? "USD")).foregroundStyle(.secondary)
                        TextField(from?.currency == "KHR" ? "0" : "0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .font(.title3.monospacedDigit())
                    }
                    TextField("Note (optional)", text: $note)
                }

                Section("Preview") {
                    VStack(spacing: 6) {
                        Text("You will receive").font(.caption).foregroundStyle(.secondary)
                        Text(converted.map { MoneyFormat.string($0, currency: to?.currency ?? "USD") } ?? "—")
                            .font(.title.weight(.bold).monospacedDigit())
                            .foregroundStyle(Theme.lotus)
                        Text(rateLine)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)

                    if let from, let to, from.currency != to.currency {
                        Button("Refresh Rate", systemImage: "arrow.clockwise") {
                            Task { await rates.refresh() }
                        }
                        .disabled(rates.isRefreshing)
                    }
                }
            }
            .navigationTitle("Transfer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Transfer") { submit() }
                        .disabled(converted == nil)
                }
            }
            .alert("Locked wallet", isPresented: $confirmingLockedWallet) {
                Button("Proceed") { perform() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("\"\(from?.name ?? "")\" is locked. Confirm to proceed with this transfer?")
            }
            .onChange(of: fromID) {
                if toID == fromID { toID = "" }
                errorMessage = nil
            }
            // Use a fresh rate for the conversion, like the web app does.
            .task { await rates.refresh() }
        }
    }

    private var rateLine: String {
        guard let from, let to else { return "Choose two wallets and an amount." }
        if from.currency == to.currency { return "Same currency — no conversion needed." }
        let rate = rates.rates.rate(from: from.currency, to: to.currency)
        return "Rate: 1 \(from.currency) = \(MoneyFormat.number(rate, fractionDigits: 4)) \(to.currency)"
    }

    private func submit() {
        errorMessage = Ledger.validateTransfer(from: from, to: to, amount: amount ?? 0)
        guard errorMessage == nil else { return }
        if from?.locked == true {
            confirmingLockedWallet = true
        } else {
            perform()
        }
    }

    private func perform() {
        guard let from, let to, let amount, let converted else { return }
        if let problem = store.transfer(from: from, to: to, amount: amount, convertedAmount: converted, note: note) {
            errorMessage = problem
            Haptics.warning()
        } else {
            Haptics.success()
            dismiss()
        }
    }
}
