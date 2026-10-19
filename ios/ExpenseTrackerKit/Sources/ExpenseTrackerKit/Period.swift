import Foundation

/// Date filter used by the dashboard, transaction list and reports.
public enum Period: Hashable, Sendable {
    case allTime
    case thisMonth
    case lastMonth
    /// Inclusive of both days.
    case custom(start: Date, end: Date)

    public static let presets: [Period] = [.allTime, .thisMonth, .lastMonth]

    public var title: String {
        switch self {
        case .allTime: "All Time"
        case .thisMonth: "This Month"
        case .lastMonth: "Last Month"
        case .custom: "Custom"
        }
    }

    public var isCustom: Bool {
        if case .custom = self { return true }
        return false
    }

    /// Half-open range `[start, end)` covered by the period, or nil for all time.
    public func range(now: Date = Date(), calendar: Calendar = .current) -> Range<Date>? {
        switch self {
        case .allTime:
            return nil
        case .thisMonth:
            guard let month = calendar.dateInterval(of: .month, for: now) else { return nil }
            return month.start..<month.end
        case .lastMonth:
            guard let lastMonthDay = calendar.date(byAdding: .month, value: -1, to: now),
                  let month = calendar.dateInterval(of: .month, for: lastMonthDay) else { return nil }
            return month.start..<month.end
        case let .custom(start, end):
            let lower = calendar.startOfDay(for: min(start, end))
            let lastDay = calendar.startOfDay(for: max(start, end))
            let upper = calendar.date(byAdding: .day, value: 1, to: lastDay) ?? lastDay
            return lower..<upper
        }
    }

    public func contains(_ date: Date, now: Date = Date(), calendar: Calendar = .current) -> Bool {
        guard let range = range(now: now, calendar: calendar) else { return true }
        return range.contains(date)
    }

    public func filter(_ entries: [Expense], now: Date = Date(), calendar: Calendar = .current) -> [Expense] {
        guard let range = range(now: now, calendar: calendar) else { return entries }
        return entries.filter { range.contains($0.date) }
    }

    /// Slug used in export file names, e.g. `expenses_2026-10`.
    public func fileLabel(now: Date = Date(), calendar: Calendar = .current) -> String {
        func stamp(_ date: Date, _ withDay: Bool) -> String {
            let c = calendar.dateComponents([.year, .month, .day], from: date)
            return withDay
                ? String(format: "%04d%02d%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
                : String(format: "%04d-%02d", c.year ?? 0, c.month ?? 0)
        }
        switch self {
        case .allTime:
            return "all_expenses"
        case .thisMonth:
            return "expenses_\(stamp(now, false))"
        case .lastMonth:
            let last = calendar.date(byAdding: .month, value: -1, to: now) ?? now
            return "expenses_\(stamp(last, false))"
        case let .custom(start, end):
            return "expenses_\(stamp(min(start, end), true))_\(stamp(max(start, end), true))"
        }
    }
}
