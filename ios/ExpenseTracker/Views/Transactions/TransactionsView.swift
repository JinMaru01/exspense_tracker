import ExpenseTrackerKit
import SwiftUI

struct TransactionsView: View {
    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @AppStorage("displayCurrency") private var currency = "USD"

    @State private var search = ""
    @State private var period = Period.allTime
    @State private var typeFilter: EntryType?
    @State private var categoryFilter: String?
    @State private var walletFilter: String?
    @State private var editing: Expense?
    @State private var deleting: Expense?
    @State private var shared: SharedFile?
    @State private var exportError: String?

    var body: some View {
        let entries = filtered
        let totals = Stats.totals(entries, in: currency, rates: rates.rates)

        NavigationStack {
            List {
                Section {
                    HStack {
                        PeriodPicker(period: $period)
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(entries.count) records").font(.caption).foregroundStyle(.secondary)
                            Text("-\(MoneyFormat.string(totals.expenses, currency: currency)) · +\(MoneyFormat.string(totals.income, currency: currency))")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                }

                if entries.isEmpty {
                    if search.isEmpty {
                        ContentUnavailableView(
                            "No transactions found",
                            systemImage: "tray",
                            description: Text(hasFilters ? "Try a different period or filter." : "Tap + to add an expense or income.")
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ContentUnavailableView.search(text: search)
                            .listRowBackground(Color.clear)
                    }
                }

                ForEach(groupedByDay(entries)) { group in
                    Section {
                        ForEach(group.entries) { entry in
                            Button {
                                editing = entry
                            } label: {
                                TransactionRow(entry: entry)
                            }
                            .swipeActions(edge: .trailing) {
                                Button("Delete", systemImage: "trash") { deleting = entry }
                                    .tint(Theme.expense)
                                Button("Edit", systemImage: "pencil") { editing = entry }
                                    .tint(Theme.transfer)
                            }
                        }
                    } header: {
                        Text(group.day, format: .dateTime.weekday(.wide).day().month(.wide).year())
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .searchable(text: $search, prompt: "Search description or category")
            .navigationTitle("Transactions")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { filterMenu }
            }
            .quickAddToolbar()
            .sheet(item: $editing) { entry in
                EntryFormView(mode: .edit(entry))
            }
            .sheet(item: $shared) { file in
                ShareSheet(items: [file.url])
            }
            .confirmationDialog(
                "Delete this transaction?",
                isPresented: Binding(isPresent: $deleting),
                titleVisibility: .visible,
                presenting: deleting
            ) { entry in
                Button("Delete", role: .destructive) {
                    store.deleteExpense(entry)
                    Haptics.success()
                }
            } message: { entry in
                Text("Wallet balances are restored. \(MoneyFormat.signed(entry.amount, currency: entry.currency, type: entry.type)) · \(entry.note.isEmpty ? entry.category : entry.note)")
            }
            .alert("Export failed", isPresented: Binding(isPresent: $exportError)) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(exportError ?? "")
            }
        }
    }

    private var filtered: [Expense] {
        let query = search.trimmingCharacters(in: .whitespaces)
        return period.filter(store.expenses).filter { e in
            (query.isEmpty || e.note.localizedCaseInsensitiveContains(query) || e.category.localizedCaseInsensitiveContains(query))
                && (typeFilter == nil || e.type == typeFilter)
                && (categoryFilter == nil || e.category == categoryFilter)
                && (walletFilter == nil || e.wallet == walletFilter || e.toWallet == walletFilter)
        }
    }

    private var hasFilters: Bool {
        typeFilter != nil || categoryFilter != nil || walletFilter != nil || period != .allTime
    }

    private struct DayGroup: Identifiable {
        let day: Date
        let entries: [Expense]
        var id: Date { day }
    }

    /// Newest day first; entries keep their newest-first order within a day.
    private func groupedByDay(_ entries: [Expense]) -> [DayGroup] {
        let calendar = Calendar.current
        return Dictionary(grouping: entries) { calendar.startOfDay(for: $0.date) }
            .map { DayGroup(day: $0.key, entries: $0.value) }
            .sorted { $0.day > $1.day }
    }

    private var filterMenu: some View {
        Menu {
            Picker("Type", selection: $typeFilter) {
                Text("All Types").tag(EntryType?.none)
                ForEach(EntryType.allCases) { type in
                    Text(type.label).tag(EntryType?.some(type))
                }
            }
            .pickerStyle(.menu)

            Picker("Category", selection: $categoryFilter) {
                Text("All Categories").tag(String?.none)
                ForEach(Categories.expense + Categories.income) { c in
                    Text("\(c.icon) \(c.name)").tag(String?.some(c.name))
                }
            }
            .pickerStyle(.menu)

            Picker("Wallet", selection: $walletFilter) {
                Text("All Wallets").tag(String?.none)
                ForEach(store.wallets) { w in
                    Text(w.name).tag(String?.some(w.name))
                }
            }
            .pickerStyle(.menu)

            Divider()

            if hasFilters {
                Button("Clear Filters", systemImage: "xmark.circle") {
                    typeFilter = nil
                    categoryFilter = nil
                    walletFilter = nil
                    period = .allTime
                }
            }
            Button("Export These as CSV", systemImage: "square.and.arrow.up") { exportFiltered() }
                .disabled(filtered.isEmpty)
        } label: {
            Image(systemName: hasFilters
                ? "line.3.horizontal.decrease.circle.fill"
                : "line.3.horizontal.decrease.circle")
                .accessibilityLabel("Filter")
        }
    }

    private func exportFiltered() {
        var name = "expenses"
        if let categoryFilter { name += "_" + categoryFilter.lowercased().replacingOccurrences(of: " ", with: "_") }
        if let walletFilter { name += "_" + walletFilter.lowercased().replacingOccurrences(of: " ", with: "_") }
        if !search.isEmpty { name += "_filtered" }
        let safeName = name.replacingOccurrences(of: "/", with: "-")
        do {
            let url = try FileExporter.writeText(CSVExport.expenses(filtered), named: "\(safeName)_\(Date().formatted(.iso8601.year().month().day())).csv")
            shared = SharedFile(url: url)
        } catch {
            exportError = error.localizedDescription
        }
    }
}
