import Foundation

/// Kind of ledger entry. Documents written before the `type` field existed are expenses.
public enum EntryType: String, CaseIterable, Identifiable, Sendable {
    case expense, income, transfer

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .expense: "Expense"
        case .income: "Income"
        case .transfer: "Transfer"
        }
    }
}

/// One record in `users/{uid}/expenses`: an expense, an income or a transfer.
/// Same shape as the web app's `Expense` type so both clients read and write the same documents.
public struct Expense: Identifiable, Hashable, Sendable {
    public var id: String
    public var amount: Double
    public var category: String
    /// Name (not id) of the wallet the money left or entered — the web app keys on names.
    public var wallet: String
    /// Stored in Firestore as `description`.
    public var note: String
    public var date: Date
    public var currency: String
    public var type: EntryType
    /// Transfers only: destination wallet name.
    public var toWallet: String?
    /// Transfers only: amount received by `toWallet`, in its currency.
    public var convertedAmount: Double?

    public init(
        id: String = "",
        amount: Double,
        category: String,
        wallet: String,
        note: String = "",
        date: Date,
        currency: String,
        type: EntryType = .expense,
        toWallet: String? = nil,
        convertedAmount: Double? = nil
    ) {
        self.id = id
        self.amount = amount
        self.category = category
        self.wallet = wallet
        self.note = note
        self.date = date
        self.currency = currency
        self.type = type
        self.toWallet = toWallet
        self.convertedAmount = convertedAmount
    }
}

public enum WalletKind: String, CaseIterable, Identifiable, Sendable {
    case cash, bank, credit, savings, digital, investment, other

    public var id: String { rawValue }

    public var emoji: String {
        switch self {
        case .cash: "💵"
        case .bank, .savings: "🏦"
        case .credit: "💳"
        case .digital: "📱"
        case .investment: "📈"
        case .other: "💼"
        }
    }

    public var label: String {
        switch self {
        case .cash: "Cash"
        case .bank: "Bank Account"
        case .credit: "Credit Card"
        case .savings: "Savings Account"
        case .digital: "Digital Wallet"
        case .investment: "Investment"
        case .other: "Other"
        }
    }
}

/// A document in `users/{uid}/wallets`.
public struct Wallet: Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var balance: Double
    public var currency: String
    /// Raw `type` string (see `WalletKind`); kept raw so unknown values survive a round trip.
    public var type: String
    public var exchangeRate: Double?
    /// Locked wallets ask for confirmation before any transaction touches them.
    public var locked: Bool

    public init(
        id: String = "",
        name: String,
        balance: Double,
        currency: String,
        type: String = WalletKind.cash.rawValue,
        exchangeRate: Double? = nil,
        locked: Bool = false
    ) {
        self.id = id
        self.name = name
        self.balance = balance
        self.currency = currency
        self.type = type
        self.exchangeRate = exchangeRate
        self.locked = locked
    }

    public var kind: WalletKind { WalletKind(rawValue: type) ?? .other }
}

public enum BillingCycle: String, CaseIterable, Identifiable, Sendable {
    case weekly, monthly, yearly

    public var id: String { rawValue }
    public var label: String { rawValue.capitalized }
}

/// A document in `users/{uid}/subscriptions`.
public struct SubscriptionPlan: Identifiable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var amount: Double
    public var currency: String
    /// Name of the wallet that gets charged.
    public var wallet: String
    public var category: String
    public var cycle: BillingCycle
    public var nextDate: Date
    public var active: Bool
    /// Stored in Firestore as `description`.
    public var note: String

    public init(
        id: String = "",
        name: String,
        amount: Double,
        currency: String,
        wallet: String,
        category: String,
        cycle: BillingCycle = .monthly,
        nextDate: Date,
        active: Bool = true,
        note: String = ""
    ) {
        self.id = id
        self.name = name
        self.amount = amount
        self.currency = currency
        self.wallet = wallet
        self.category = category
        self.cycle = cycle
        self.nextDate = nextDate
        self.active = active
        self.note = note
    }
}
