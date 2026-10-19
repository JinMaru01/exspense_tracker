import ExpenseTrackerKit
import Foundation
import UserNotifications

/// Local notifications: a heads-up on the day each active subscription is due, and an
/// evening nudge on days with nothing logged — the phone-side version of the web project's
/// Telegram daily reminder (scripts/check-daily-expense.mjs).
///
/// Notifications are fully rebuilt whenever the inputs change. The daily reminder is scheduled
/// one day at a time for the next two weeks so that today's can be skipped once something is
/// logged; opening the app tops the queue up again.
enum ReminderScheduler {
    enum Keys {
        static let subscriptions = "reminders.subscriptions"
        static let daily = "reminders.daily"
        static let dailyHour = "reminders.dailyHour"
    }

    static let defaultDailyHour = 21
    private static let subscriptionHour = 9
    private static let dailyDays = 14
    /// iOS keeps at most 64 pending notifications per app.
    private static let maxSubscriptionReminders = 40

    struct Settings: Equatable {
        var subscriptions: Bool
        var daily: Bool
        var dailyHour: Int
    }

    static func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    static func isAuthorized() async -> Bool {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        return status == .authorized || status == .provisional || status == .ephemeral
    }

    static func reschedule(
        settings: Settings,
        subscriptions: [SubscriptionPlan],
        loggedToday: Bool,
        now: Date = Date(),
        calendar: Calendar = .current
    ) async {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        guard settings.subscriptions || settings.daily, await isAuthorized() else { return }

        var requests: [UNNotificationRequest] = []

        if settings.subscriptions {
            let upcoming = subscriptions
                .filter(\.active)
                .sorted { $0.nextDate < $1.nextDate }
            for plan in upcoming {
                guard requests.count < maxSubscriptionReminders,
                      let fireDate = calendar.date(bySettingHour: subscriptionHour, minute: 0, second: 0, of: plan.nextDate),
                      fireDate > now
                else { continue }
                let content = UNMutableNotificationContent()
                content.title = "\(plan.name) is due today"
                content.body = "\(MoneyFormat.string(plan.amount, currency: plan.currency)) from \(plan.wallet). Open Subscriptions to record the charge."
                content.sound = .default
                requests.append(request(id: "sub-\(plan.id)", content: content, at: fireDate, calendar: calendar))
            }
        }

        if settings.daily {
            for offset in 0..<dailyDays {
                guard let day = calendar.date(byAdding: .day, value: offset, to: now),
                      let fireDate = calendar.date(bySettingHour: settings.dailyHour, minute: 0, second: 0, of: day),
                      fireDate > now,
                      !(offset == 0 && loggedToday)
                else { continue }
                let content = UNMutableNotificationContent()
                content.title = "📝 Expense reminder"
                content.body = "You haven't logged any expense today. Don't forget to record your transactions! 💰"
                content.sound = .default
                let stamp = calendar.dateComponents([.year, .month, .day], from: day)
                let id = "daily-\(stamp.year ?? 0)-\(stamp.month ?? 0)-\(stamp.day ?? 0)"
                requests.append(request(id: id, content: content, at: fireDate, calendar: calendar))
            }
        }

        for request in requests {
            try? await center.add(request)
        }
    }

    private static func request(id: String, content: UNNotificationContent, at date: Date, calendar: Calendar) -> UNNotificationRequest {
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        return UNNotificationRequest(identifier: id, content: content, trigger: trigger)
    }
}
