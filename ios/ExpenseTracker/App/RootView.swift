import ExpenseTrackerKit
import SwiftUI

struct RootView: View {
    @Environment(AuthService.self) private var auth

    var body: some View {
        if !FirebaseBootstrap.isConfigured {
            SetupRequiredView()
        } else if auth.isRestoring {
            LoadingView(message: "Loading…")
        } else if let account = auth.account {
            SignedInView(account: account)
                .id(account.uid)
        } else {
            SignInView()
        }
    }
}

/// Owns the signed-in user's data store for as long as they stay signed in.
private struct SignedInView: View {
    let account: Account
    @State private var store: DataStore

    init(account: Account) {
        self.account = account
        _store = State(initialValue: DataStore(uid: account.uid))
    }

    var body: some View {
        Group {
            if store.isLoaded {
                MainTabView()
            } else {
                LoadingView(message: "Syncing your data…", systemImage: "icloud.and.arrow.down")
            }
        }
        .environment(store)
        .onAppear { store.start() }
        .onDisappear { store.stop() }
    }
}

struct LoadingView: View {
    let message: String
    var systemImage: String?

    var body: some View {
        VStack(spacing: 16) {
            LotusBadge(size: 64)
            ProgressView()
            Label {
                Text(message)
            } icon: {
                if let systemImage { Image(systemName: systemImage) }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
    }
}

struct MainTabView: View {
    enum Tab: Hashable {
        case dashboard, transactions, wallets, subscriptions, reports
    }

    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab = Tab.dashboard

    @AppStorage(ReminderScheduler.Keys.subscriptions) private var remindSubscriptions = false
    @AppStorage(ReminderScheduler.Keys.daily) private var remindDaily = false
    @AppStorage(ReminderScheduler.Keys.dailyHour) private var dailyHour = ReminderScheduler.defaultDailyHour

    var body: some View {
        TabView(selection: $tab) {
            DashboardView(showTransactions: { tab = .transactions })
                .tabItem { Label("Dashboard", systemImage: "chart.pie.fill") }
                .tag(Tab.dashboard)
            TransactionsView()
                .tabItem { Label("Transactions", systemImage: "list.bullet.rectangle.portrait") }
                .tag(Tab.transactions)
            WalletsView()
                .tabItem { Label("Wallets", systemImage: "wallet.pass.fill") }
                .tag(Tab.wallets)
            SubscriptionsView()
                .tabItem { Label("Subscriptions", systemImage: "calendar.badge.clock") }
                .badge(store.overdueSubscriptionCount)
                .tag(Tab.subscriptions)
            ReportsView()
                .tabItem { Label("Reports", systemImage: "chart.bar.doc.horizontal") }
                .tag(Tab.reports)
        }
        .task { await rates.refreshIfStale() }
        .task(id: reminderInputs) {
            guard scenePhase == .active else { return }
            await ReminderScheduler.reschedule(
                settings: reminderInputs.settings,
                subscriptions: store.subscriptions,
                loggedToday: reminderInputs.loggedToday
            )
        }
        .alert("Sync problem", isPresented: Binding(isPresent: Binding(
            get: { store.syncError },
            set: { store.syncError = $0 }
        ))) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(store.syncError ?? "")
        }
    }

    /// Everything the scheduled reminders depend on; a change reschedules them.
    private struct ReminderInputs: Equatable {
        var settings: ReminderScheduler.Settings
        var subscriptions: [SubscriptionPlan]
        var loggedToday: Bool
        var day: Date
        var active: Bool
    }

    private var reminderInputs: ReminderInputs {
        let today = Calendar.current.startOfDay(for: Date())
        return ReminderInputs(
            settings: .init(subscriptions: remindSubscriptions, daily: remindDaily, dailyHour: dailyHour),
            subscriptions: store.subscriptions,
            loggedToday: Stats.hasEntry(on: today, in: store.expenses),
            day: today,
            active: scenePhase == .active
        )
    }
}
