import Charts
import ExpenseTrackerKit
import SwiftUI

/// Everything a report shows, computed once so the screen and the PDF render the same numbers.
struct ReportData {
    let period: Period
    let currency: String
    let entries: [Expense]
    let totals: Totals
    let categories: [CategoryShare]
    let monthly: [MonthlyPoint]
    let wallets: [WalletActivity]
    let subscriptions: [SubscriptionPlan]
    let subscriptionMonthlyUSD: Double

    @MainActor
    init(period: Period, currency: String, store: DataStore, rates: ExchangeRates) {
        let entries = period.filter(store.expenses)
        self.period = period
        self.currency = currency
        self.entries = entries
        totals = Stats.totals(entries, in: currency, rates: rates)
        categories = Stats.categoryBreakdown(entries, in: currency, rates: rates)
        monthly = Stats.monthly(entries, in: currency, rates: rates)
        wallets = Stats.walletActivity(entries, wallets: store.wallets)
        subscriptions = store.subscriptions.sorted { $0.nextDate < $1.nextDate }
        subscriptionMonthlyUSD = SubscriptionMath.monthlyEstimate(store.subscriptions, in: "USD", rates: rates)
    }

    var dateRangeText: String? {
        guard let first = entries.map(\.date).min(), let last = entries.map(\.date).max() else { return nil }
        let style = Date.FormatStyle.dateTime.day().month(.abbreviated).year()
        return "\(first.formatted(style)) — \(last.formatted(style)) · \(entries.count) records"
    }
}

struct ReportsView: View {
    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @AppStorage("displayCurrency") private var currency = "USD"
    @State private var period = Period.thisMonth
    @State private var shared: SharedFile?
    @State private var exportError: String?

    var body: some View {
        let data = ReportData(period: period, currency: currency, store: store, rates: rates.rates)

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        PeriodPicker(period: $period)
                        Spacer()
                        CurrencyToggle(currency: $currency)
                    }
                    if let range = data.dateRangeText {
                        Label(range, systemImage: "calendar")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    ReportContent(data: data)

                    Card(title: "Export") {
                        Text("\(data.period.fileLabel()) · \(data.entries.count) records")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                        HStack(spacing: 12) {
                            Button {
                                exportCSV(data)
                            } label: {
                                Label("CSV", systemImage: "tablecells")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            Button {
                                exportPDF(data)
                            } label: {
                                Label("PDF Report", systemImage: "doc.richtext")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .controlSize(.large)
                        .disabled(data.entries.isEmpty)
                    }
                }
                .padding()
            }
            .background(Theme.background)
            .navigationTitle("Reports")
            .sheet(item: $shared) { ShareSheet(items: [$0.url]) }
            .alert("Export failed", isPresented: Binding(isPresent: $exportError)) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(exportError ?? "")
            }
        }
    }

    private func exportCSV(_ data: ReportData) {
        let stamp = Date().formatted(.iso8601.year().month().day())
        do {
            let url = try FileExporter.writeText(CSVExport.expenses(data.entries), named: "\(data.period.fileLabel())_\(stamp).csv")
            shared = SharedFile(url: url)
        } catch {
            exportError = error.localizedDescription
        }
    }

    private func exportPDF(_ data: ReportData) {
        let page = VStack(alignment: .leading, spacing: 16) {
            HStack {
                LotusBadge(size: 40)
                VStack(alignment: .leading) {
                    Text("Expense Report").font(.title2.weight(.bold))
                    Text("\(data.period.title) · generated \(Date().formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if let range = data.dateRangeText {
                Text(range).font(.caption).foregroundStyle(.secondary)
            }
            ReportContent(data: data)
        }
        .padding(28)
        .background(Color(hex: "#faf7f2"))

        if let url = FileExporter.writePDF(page, named: "\(data.period.fileLabel())_report.pdf") {
            shared = SharedFile(url: url)
        } else {
            exportError = "The PDF couldn't be created."
        }
    }
}

/// Report body shared by the Reports tab and the PDF export (no scroll views or lists, so it renders off-screen).
struct ReportContent: View {
    let data: ReportData

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            summaryGrid
            monthlyChart
            categoryChart
            Card(title: "Top Spending Categories") {
                CategoryBreakdownList(shares: data.categories, currency: data.currency, limit: 8)
            }
            walletActivity
            if !data.subscriptions.isEmpty { subscriptionsCard }
        }
    }

    private var summaryGrid: some View {
        let net = data.totals.net
        return Grid(horizontalSpacing: 12, verticalSpacing: 12) {
            GridRow {
                StatCard(title: "Income", value: money(data.totals.income), color: Theme.income,
                         systemImage: "arrow.up.right", footnote: "\(data.totals.incomeCount) records · Received")
                StatCard(title: "Expenses", value: money(data.totals.expenses), color: Theme.expense,
                         systemImage: "arrow.down.right", footnote: "\(data.totals.expenseCount) records · Spent")
            }
            GridRow {
                StatCard(title: "Transfers", value: money(data.totals.transfers), color: Theme.transfer,
                         systemImage: "arrow.left.arrow.right", footnote: "\(data.totals.transferCount) records · Moved")
                StatCard(title: "Net Balance", value: money(abs(net)), color: net >= 0 ? Theme.lotus : Theme.expense,
                         systemImage: net >= 0 ? "arrow.up.circle" : "arrow.down.circle",
                         footnote: "\(data.entries.count) records · \(net >= 0 ? "Surplus" : "Deficit")")
            }
        }
    }

    private var monthlyChart: some View {
        Card(title: "Monthly Income vs Expenses") {
            if data.monthly.isEmpty {
                emptyText("No data for this period.")
            } else {
                Chart {
                    ForEach(data.monthly) { point in
                        BarMark(x: .value("Month", point.label), y: .value("Amount", point.income))
                            .foregroundStyle(by: .value("Type", "Income"))
                            .position(by: .value("Type", "Income"))
                            .cornerRadius(3)
                        BarMark(x: .value("Month", point.label), y: .value("Amount", point.expense))
                            .foregroundStyle(by: .value("Type", "Expenses"))
                            .position(by: .value("Type", "Expenses"))
                            .cornerRadius(3)
                    }
                }
                .chartForegroundStyleScale(["Income": Theme.income, "Expenses": Theme.expense])
                .chartLegend(position: .bottom)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisGridLine()
                        AxisValueLabel {
                            if let amount = value.as(Double.self) { Text(shortMoney(amount)) }
                        }
                    }
                }
                .frame(height: 220)
            }
        }
    }

    private var categoryChart: some View {
        Card(title: "Expense Breakdown") {
            if data.categories.isEmpty {
                emptyText("No expense data.")
            } else {
                HStack(spacing: 16) {
                    Chart(data.categories) { share in
                        SectorMark(angle: .value("Total", share.total), innerRadius: .ratio(0.55), angularInset: 1.5)
                            .foregroundStyle(share.category.color)
                            .cornerRadius(3)
                    }
                    .frame(width: 150, height: 150)
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(data.categories.prefix(6)) { share in
                            HStack(spacing: 6) {
                                Circle().fill(share.category.color).frame(width: 8, height: 8)
                                Text("\(share.category.icon) \(share.category.name)")
                                    .font(.caption)
                                    .lineLimit(1)
                                Spacer(minLength: 4)
                                Text(String(format: "%.0f%%", share.percent))
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private var walletActivity: some View {
        Card(title: "Wallet Activity") {
            if data.wallets.isEmpty {
                emptyText("No wallet activity for this period.")
            } else {
                VStack(spacing: 12) {
                    ForEach(data.wallets) { w in
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(w.name).font(.subheadline.weight(.medium))
                                Text("\(w.currency) · \(w.transactionCount) txns").font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(MoneyFormat.string(w.balance, currency: w.currency))
                                    .font(.subheadline.weight(.bold).monospacedDigit())
                                    .foregroundStyle(w.balance < 0 ? Theme.expense : .primary)
                                Text("-\(MoneyFormat.string(w.spent, currency: w.currency)) · +\(MoneyFormat.string(w.received, currency: w.currency))")
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private var subscriptionsCard: some View {
        Card(title: "Subscriptions") {
            VStack(spacing: 10) {
                ForEach(data.subscriptions) { plan in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(plan.name).font(.subheadline.weight(.medium))
                            Text("\(plan.wallet) · Due \(plan.nextDate.formatted(date: .abbreviated, time: .omitted))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(MoneyFormat.string(plan.amount, currency: plan.currency)) / \(plan.cycle.rawValue)")
                                .font(.subheadline.monospacedDigit())
                            if plan.active {
                                DueBadge(status: SubscriptionMath.status(of: plan))
                            } else {
                                Text("Inactive").font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .opacity(plan.active ? 1 : 0.6)
                }
                Divider()
                HStack {
                    Text("Active: \(data.subscriptions.filter(\.active).count)")
                    Spacer()
                    Text("Est. monthly: \(MoneyFormat.string(data.subscriptionMonthlyUSD, currency: "USD"))")
                        .foregroundStyle(Theme.lotus)
                }
                .font(.subheadline.weight(.medium))
            }
        }
    }

    private func money(_ value: Double) -> String {
        MoneyFormat.string(value, currency: data.currency)
    }

    private func shortMoney(_ value: Double) -> String {
        let symbol = Currencies.symbol(for: data.currency)
        if data.currency == "KHR" {
            return value >= 1000 ? "\(symbol)\(Int((value / 1000).rounded()))k" : "\(symbol)\(Int(value.rounded()))"
        }
        return "\(symbol)\(Int(value.rounded()))"
    }

    private func emptyText(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 20)
    }
}
