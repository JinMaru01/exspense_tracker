import ExpenseTrackerKit
import SwiftUI

struct DashboardView: View {
    var showTransactions: () -> Void

    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @Environment(AuthService.self) private var auth
    @AppStorage("displayCurrency") private var currency = "USD"
    @State private var period = Period.allTime
    @State private var showingSettings = false

    var body: some View {
        let entries = period.filter(store.expenses)
        let totals = Stats.totals(entries, in: currency, rates: rates.rates)
        let shares = Stats.categoryBreakdown(entries, in: currency, rates: rates.rates)

        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    HStack {
                        PeriodPicker(period: $period)
                        Spacer()
                        CurrencyToggle(currency: $currency)
                    }

                    NetBalanceCard(totals: totals, currency: currency)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                        StatCard(title: "Income", value: MoneyFormat.string(totals.income, currency: currency),
                                 color: Theme.income, systemImage: "arrow.up.right",
                                 footnote: "\(totals.incomeCount) records")
                        StatCard(title: "Expenses", value: MoneyFormat.string(totals.expenses, currency: currency),
                                 color: Theme.expense, systemImage: "arrow.down.right",
                                 footnote: "\(totals.expenseCount) records")
                        StatCard(title: "Transfers", value: MoneyFormat.string(totals.transfers, currency: currency),
                                 color: Theme.transfer, systemImage: "arrow.left.arrow.right",
                                 footnote: "\(totals.transferCount) records")
                        StatCard(title: "All Wallets",
                                 value: MoneyFormat.string(Stats.portfolioValue(store.wallets, in: currency, rates: rates.rates), currency: currency),
                                 color: Theme.lotus, systemImage: "wallet.pass",
                                 footnote: "\(store.wallets.count) wallets")
                    }

                    Card(title: "By Category") {
                        CategoryBreakdownList(shares: shares, currency: currency)
                    }

                    Card {
                        HStack {
                            Text("Recent Transactions").font(.headline)
                            Spacer()
                            Button("See All", action: showTransactions).font(.subheadline)
                        }
                        if store.expenses.isEmpty {
                            Text("No transactions yet. Tap + to add your first one.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        } else {
                            VStack(spacing: 10) {
                                ForEach(store.expenses.prefix(5)) { entry in
                                    TransactionRow(entry: entry)
                                }
                            }
                        }
                    }

                    Card(title: "Tools") {
                        NavigationLink {
                            CurrencyConverterView()
                        } label: {
                            Label("Currency Converter", systemImage: "dollarsign.arrow.circlepath")
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        RateFootnote()
                    }
                }
                .padding()
            }
            .background(Theme.background)
            .navigationTitle("Dashboard")
            .refreshable { await rates.refresh() }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showingSettings = true
                    } label: {
                        AvatarView(account: auth.account, size: 32)
                    }
                    .accessibilityLabel("Account and settings")
                }
            }
            .quickAddToolbar()
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
        }
    }
}

private struct NetBalanceCard: View {
    let totals: Totals
    let currency: String

    var body: some View {
        let surplus = totals.net >= 0
        VStack(alignment: .leading, spacing: 14) {
            Text("Net Balance")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white.opacity(0.85))
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Image(systemName: surplus ? "arrow.up.circle.fill" : "arrow.down.circle.fill")
                Text(MoneyFormat.string(abs(totals.net), currency: currency))
                    .font(.largeTitle.weight(.bold).monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }
            .foregroundStyle(.white)
            Text(surplus ? "Surplus" : "Deficit")
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(.white.opacity(0.2), in: Capsule())
                .foregroundStyle(.white)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: surplus
                    ? [Color(hex: "#c5345d"), Color(hex: "#ea7c9b")]
                    : [Color(hex: "#b91c1c"), Color(hex: "#ef4444")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 20, style: .continuous)
        )
        .accessibilityElement(children: .combine)
    }
}

/// "1 USD = ៛4,100 · updated 2 hours ago"
struct RateFootnote: View {
    @Environment(ExchangeRateService.self) private var rates

    var body: some View {
        HStack(spacing: 6) {
            Text("1 USD = \(MoneyFormat.string(rates.rates.rate(for: "KHR"), currency: "KHR"))")
            if let updated = rates.lastUpdated {
                Text("· updated \(updated, format: .relative(presentation: .named))")
            } else {
                Text("· offline estimate")
            }
            if rates.isRefreshing {
                ProgressView().controlSize(.mini)
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }
}
