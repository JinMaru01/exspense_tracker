import Foundation

/// Wallet balance bookkeeping, ported from hooks/use-firebase-data.ts.
///
/// Balance changes are expressed as `[walletName: delta]` because entries reference wallets by
/// name. The data layer turns each non-zero delta into an atomic increment on that wallet.
public enum Ledger {
    /// What recording `entry` does to wallet balances.
    public static func effects(of entry: Expense) -> [String: Double] {
        switch entry.type {
        case .expense:
            return [entry.wallet: -entry.amount]
        case .income:
            return [entry.wallet: entry.amount]
        case .transfer:
            var result = [entry.wallet: -entry.amount]
            if let to = entry.toWallet {
                result[to, default: 0] += entry.convertedAmount ?? entry.amount
            }
            return result
        }
    }

    /// What deleting `entry` does to wallet balances.
    public static func reversal(of entry: Expense) -> [String: Double] {
        effects(of: entry).mapValues { -$0 }
    }

    /// Net balance changes for editing `original` into `updated`: undo the old entry, apply the new one.
    public static func deltas(replacing original: Expense, with updated: Expense) -> [String: Double] {
        reversal(of: original)
            .merging(effects(of: updated), uniquingKeysWith: +)
            .filter { abs($0.value) > 1e-9 }
    }

    /// Spendable balance of `wallet` if `original` (being edited) had never been recorded.
    public static func available(in wallet: Wallet, excluding original: Expense? = nil) -> Double {
        guard let original else { return wallet.balance }
        return wallet.balance - (effects(of: original)[wallet.name] ?? 0)
    }

    public static func insufficientFundsMessage(for wallet: Wallet, available: Double) -> String {
        "Insufficient balance in \"\(wallet.name)\". Available: \(MoneyFormat.string(available, currency: wallet.currency))"
    }

    /// Error message if `wallet` can't cover `amount`, accounting for the entry being edited.
    public static func validateSpend(amount: Double, from wallet: Wallet, replacing original: Expense? = nil) -> String? {
        let available = available(in: wallet, excluding: original)
        return available < amount ? insufficientFundsMessage(for: wallet, available: available) : nil
    }

    public static func validateTransfer(from: Wallet?, to: Wallet?, amount: Double) -> String? {
        guard let from, let to else { return "Choose both wallets." }
        if from.id == to.id { return "Cannot transfer to the same wallet." }
        if amount <= 0 { return "Amount must be greater than 0." }
        if amount > from.balance { return "Insufficient balance in source wallet." }
        return nil
    }

    /// The record written for a wallet-to-wallet transfer.
    public static func transferEntry(
        from: Wallet, to: Wallet, amount: Double, convertedAmount: Double, note: String, date: Date
    ) -> Expense {
        let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
        let fallback = "Transfer to \(to.name)"
            + (from.currency != to.currency ? " (\(String(format: "%.2f", convertedAmount)) \(to.currency))" : "")
        return Expense(
            amount: amount,
            category: "Transfer",
            wallet: from.name,
            note: trimmed.isEmpty ? fallback : trimmed,
            date: date,
            currency: from.currency,
            type: .transfer,
            toWallet: to.name,
            convertedAmount: convertedAmount
        )
    }

    public enum Adjustment: String, CaseIterable, Identifiable, Sendable {
        case add, subtract
        public var id: String { rawValue }
    }

    /// Manual balance correction. Returns the record to log (only when a reason is given, like the
    /// web app) and the balance delta to apply.
    public static func adjustment(
        of wallet: Wallet, amount: Double, direction: Adjustment, reason: String, date: Date
    ) -> (entry: Expense?, delta: Double) {
        let delta = direction == .add ? amount : -amount
        let trimmed = reason.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return (nil, delta) }
        let entry = Expense(
            amount: amount,
            category: direction == .add ? "Income/Deposit" : "Fees/Withdrawal",
            wallet: wallet.name,
            note: trimmed,
            date: date,
            currency: wallet.currency,
            type: direction == .add ? .income : .expense
        )
        return (entry, delta)
    }
}
