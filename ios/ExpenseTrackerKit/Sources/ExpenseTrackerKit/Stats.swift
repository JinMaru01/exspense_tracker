import Foundation

public struct Totals: Equatable, Sendable {
    public var income: Double = 0
    public var expenses: Double = 0
    public var transfers: Double = 0
    public var incomeCount = 0
    public var expenseCount = 0
    public var transferCount = 0

    public init() {}

    public var net: Double { income - expenses }
}

public struct CategoryShare: Identifiable, Equatable, Sendable {
    public let category: CategoryInfo
    public let total: Double
    /// 0–100
    public let percent: Double

    public var id: String { category.name }
}

public struct MonthlyPoint: Identifiable, Equatable, Sendable {
    public let monthStart: Date
    /// e.g. `Oct 26`
    public let label: String
    public var income: Double
    public var expense: Double

    public var id: Date { monthStart }
}

public struct WalletActivity: Identifiable, Equatable, Sendable {
    public let walletID: String
    public let name: String
    public let currency: String
    public let balance: Double
    /// In the wallet's own currency.
    public let spent: Double
    public let received: Double
    public let transactionCount: Int

    public var id: String { walletID }
}

/// Summaries shown on the dashboard and in reports. Amounts in different currencies are
/// converted into the display currency first.
public enum Stats {
    public static func totals(_ entries: [Expense], in currency: String, rates: ExchangeRates) -> Totals {
        var t = Totals()
        for e in entries {
            let value = rates.convert(e.amount, from: e.currency, to: currency)
            switch e.type {
            case .income:
                t.income += value
                t.incomeCount += 1
            case .expense:
                t.expenses += value
                t.expenseCount += 1
            case .transfer:
                t.transfers += value
                t.transferCount += 1
            }
        }
        return t
    }

    /// Expense totals per category, largest first. Categories outside the built-in list are kept
    /// (with a neutral colour) so the percentages always add up to 100.
    public static func categoryBreakdown(_ entries: [Expense], in currency: String, rates: ExchangeRates) -> [CategoryShare] {
        var totals: [String: Double] = [:]
        for e in entries where e.type == .expense {
            totals[e.category, default: 0] += rates.convert(e.amount, from: e.currency, to: currency)
        }
        let sum = totals.values.reduce(0, +)
        return totals
            .filter { $0.value > 0 }
            .map { name, total in
                CategoryShare(category: Categories.named(name), total: total, percent: sum > 0 ? total / sum * 100 : 0)
            }
            .sorted { $0.total == $1.total ? $0.category.name < $1.category.name : $0.total > $1.total }
    }

    /// Income vs expenses per calendar month, oldest first, limited to the most recent `limit` months with data.
    public static func monthly(
        _ entries: [Expense], in currency: String, rates: ExchangeRates,
        calendar: Calendar = .current, limit: Int = 12
    ) -> [MonthlyPoint] {
        let labelFormatter = DateFormatter()
        labelFormatter.locale = Locale(identifier: "en_US_POSIX")
        labelFormatter.calendar = calendar
        labelFormatter.timeZone = calendar.timeZone
        labelFormatter.dateFormat = "MMM yy"

        var points: [Date: MonthlyPoint] = [:]
        for e in entries where e.type != .transfer {
            guard let start = calendar.dateInterval(of: .month, for: e.date)?.start else { continue }
            let value = rates.convert(e.amount, from: e.currency, to: currency)
            var point = points[start] ?? MonthlyPoint(monthStart: start, label: labelFormatter.string(from: start), income: 0, expense: 0)
            if e.type == .income { point.income += value } else { point.expense += value }
            points[start] = point
        }
        return Array(points.values.sorted { $0.monthStart < $1.monthStart }.suffix(limit))
    }

    /// Per-wallet activity within `entries`; wallets without any activity are omitted.
    public static func walletActivity(_ entries: [Expense], wallets: [Wallet]) -> [WalletActivity] {
        wallets.compactMap { w in
            let own = entries.filter { $0.wallet == w.name }
            guard !own.isEmpty else { return nil }
            return WalletActivity(
                walletID: w.id,
                name: w.name,
                currency: w.currency,
                balance: w.balance,
                spent: own.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount },
                received: own.filter { $0.type == .income }.reduce(0) { $0 + $1.amount },
                transactionCount: own.count
            )
        }
    }

    public static func portfolioValue(_ wallets: [Wallet], in currency: String, rates: ExchangeRates) -> Double {
        wallets.reduce(0) { $0 + rates.convert($1.balance, from: $1.currency, to: currency) }
    }

    /// Whether any entry (of any type) is dated on `day` — drives the daily logging reminder.
    public static func hasEntry(on day: Date, in entries: [Expense], calendar: Calendar = .current) -> Bool {
        entries.contains { calendar.isDate($0.date, inSameDayAs: day) }
    }
}
