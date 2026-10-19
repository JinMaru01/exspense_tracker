import Foundation

public extension BillingCycle {
    /// The billing date after `date` (month/year steps clamp to the month's last day, like dayjs).
    func advance(_ date: Date, calendar: Calendar = .current) -> Date {
        switch self {
        case .weekly: calendar.date(byAdding: .day, value: 7, to: date) ?? date
        case .monthly: calendar.date(byAdding: .month, value: 1, to: date) ?? date
        case .yearly: calendar.date(byAdding: .year, value: 1, to: date) ?? date
        }
    }

    /// Multiplier that turns one charge into an average monthly cost.
    var monthlyFactor: Double {
        switch self {
        case .weekly: 4.33
        case .monthly: 1
        case .yearly: 1.0 / 12.0
        }
    }
}

public enum DueStatus: Equatable, Sendable {
    case overdue(days: Int)
    case today
    /// Due within three days.
    case soon(days: Int)
    /// Due within a week.
    case thisWeek(days: Int)
    case later(days: Int)

    public init(daysUntil days: Int) {
        switch days {
        case ..<0: self = .overdue(days: -days)
        case 0: self = .today
        case 1...3: self = .soon(days: days)
        case 4...7: self = .thisWeek(days: days)
        default: self = .later(days: days)
        }
    }

    public var label: String {
        switch self {
        case .overdue(let d): "Overdue \(d)d"
        case .today: "Due today"
        case .soon(let d), .thisWeek(let d), .later(let d): "In \(d)d"
        }
    }
}

public enum SubscriptionMath {
    /// Whole calendar days from today to `date` (negative when overdue).
    public static func daysUntil(_ date: Date, now: Date = Date(), calendar: Calendar = .current) -> Int {
        let from = calendar.startOfDay(for: now)
        let to = calendar.startOfDay(for: date)
        return calendar.dateComponents([.day], from: from, to: to).day ?? 0
    }

    public static func status(of subscription: SubscriptionPlan, now: Date = Date(), calendar: Calendar = .current) -> DueStatus {
        DueStatus(daysUntil: daysUntil(subscription.nextDate, now: now, calendar: calendar))
    }

    /// Active and due today or earlier — the count shown as the tab badge.
    public static func needsAttention(_ subscription: SubscriptionPlan, now: Date = Date(), calendar: Calendar = .current) -> Bool {
        subscription.active && daysUntil(subscription.nextDate, now: now, calendar: calendar) <= 0
    }

    public static func monthlyEstimate(_ subscriptions: [SubscriptionPlan], in currency: String, rates: ExchangeRates) -> Double {
        subscriptions
            .filter(\.active)
            .reduce(0) { sum, s in
                sum + rates.convert(s.amount, from: s.currency, to: currency) * s.cycle.monthlyFactor
            }
    }

    public static func validateCharge(_ subscription: SubscriptionPlan, wallet: Wallet?) -> String? {
        guard let wallet else { return "Wallet \"\(subscription.wallet)\" not found." }
        if wallet.balance < subscription.amount { return "Insufficient balance in \"\(wallet.name)\"." }
        return nil
    }

    /// The expense recorded when a subscription is charged.
    public static func chargeEntry(for subscription: SubscriptionPlan, date: Date) -> Expense {
        Expense(
            amount: subscription.amount,
            category: subscription.category,
            wallet: subscription.wallet,
            note: subscription.name,
            date: date,
            currency: subscription.currency,
            type: .expense
        )
    }
}
