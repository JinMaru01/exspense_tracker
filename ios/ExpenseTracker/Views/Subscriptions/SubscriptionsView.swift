import ExpenseTrackerKit
import SwiftUI

struct SubscriptionsView: View {
    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @State private var adding = false
    @State private var editing: SubscriptionPlan?
    @State private var charging: SubscriptionPlan?
    @State private var deleting: SubscriptionPlan?
    @State private var chargeError: String?
    @State private var shared: SharedFile?

    var body: some View {
        // Active first, then by due date.
        let plans = store.subscriptions.sorted { a, b in
            a.active != b.active ? a.active : a.nextDate < b.nextDate
        }
        let active = plans.filter(\.active)
        let dueThisWeek = active.filter { SubscriptionMath.daysUntil($0.nextDate) <= 7 }.count

        NavigationStack {
            List {
                Section {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                        StatCard(title: "Active", value: "\(active.count) of \(plans.count)",
                                 color: Theme.income, systemImage: "bell")
                        StatCard(title: "Due This Week", value: "\(dueThisWeek)",
                                 color: dueThisWeek > 0 ? Theme.expense : .secondary, systemImage: "clock")
                    }
                    StatCard(title: "Est. Monthly Cost",
                             value: MoneyFormat.string(SubscriptionMath.monthlyEstimate(plans, in: "USD", rates: rates.rates), currency: "USD"),
                             color: Theme.lotus, systemImage: "calendar")
                }
                .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                if plans.isEmpty {
                    ContentUnavailableView {
                        Label("No subscriptions yet", systemImage: "calendar.badge.plus")
                    } description: {
                        Text("Add Netflix, iCloud, rent or any other recurring expense to see what's coming up.")
                    } actions: {
                        Button("Add Subscription") { adding = true }
                            .buttonStyle(.borderedProminent)
                    }
                    .listRowBackground(Color.clear)
                } else {
                    Section {
                        ForEach(plans) { plan in
                            Button {
                                editing = plan
                            } label: {
                                SubscriptionRow(plan: plan)
                            }
                            .swipeActions(edge: .leading) {
                                if plan.active {
                                    Button("Charge", systemImage: "bolt.fill") { charging = plan }
                                        .tint(Theme.income)
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button("Delete", systemImage: "trash") { deleting = plan }
                                    .tint(Theme.expense)
                                Button(plan.active ? "Pause" : "Resume", systemImage: plan.active ? "pause" : "play") {
                                    store.setActive(plan, !plan.active)
                                }
                                .tint(.orange)
                            }
                            .contextMenu {
                                if plan.active {
                                    Button("Charge Now", systemImage: "bolt.fill") { charging = plan }
                                }
                                Button("Edit", systemImage: "pencil") { editing = plan }
                                Button(plan.active ? "Pause" : "Resume", systemImage: plan.active ? "pause" : "play") {
                                    store.setActive(plan, !plan.active)
                                }
                                Button("Delete", systemImage: "trash", role: .destructive) { deleting = plan }
                            }
                        }
                    } header: {
                        Text("Upcoming")
                    } footer: {
                        Text("Swipe right to charge now: the expense is recorded and the next due date moves forward.")
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Subscriptions")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Export CSV", systemImage: "square.and.arrow.up") { export(plans) }
                        .disabled(plans.isEmpty)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Add Subscription", systemImage: "plus.circle.fill") { adding = true }
                }
            }
            .sheet(isPresented: $adding) { SubscriptionFormView(plan: nil) }
            .sheet(item: $editing) { SubscriptionFormView(plan: $0) }
            .sheet(item: $shared) { ShareSheet(items: [$0.url]) }
            .confirmationDialog(
                "Charge now?",
                isPresented: Binding(isPresent: $charging),
                titleVisibility: .visible,
                presenting: charging
            ) { plan in
                Button("Charge \(MoneyFormat.string(plan.amount, currency: plan.currency))") {
                    if let error = store.charge(plan) {
                        chargeError = error
                        Haptics.warning()
                    } else {
                        Haptics.success()
                    }
                }
            } message: { plan in
                Text("Records \(plan.name) as an expense from \(plan.wallet) and moves the next due date to \(plan.cycle.advance(plan.nextDate).formatted(date: .abbreviated, time: .omitted)).")
            }
            .confirmationDialog(
                "Delete subscription?",
                isPresented: Binding(isPresent: $deleting),
                titleVisibility: .visible,
                presenting: deleting
            ) { plan in
                Button("Delete \(plan.name)", role: .destructive) { store.deleteSubscription(plan) }
            }
            .alert("Couldn't charge", isPresented: Binding(isPresent: $chargeError)) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(chargeError ?? "")
            }
        }
    }

    private func export(_ plans: [SubscriptionPlan]) {
        if let url = try? FileExporter.writeText(CSVExport.subscriptions(plans), named: "subscriptions.csv") {
            shared = SharedFile(url: url)
        }
    }
}

private struct SubscriptionRow: View {
    let plan: SubscriptionPlan

    var body: some View {
        HStack(spacing: 12) {
            CategoryIcon(category: Categories.named(plan.category))
            VStack(alignment: .leading, spacing: 2) {
                Text(plan.name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.primary)
                Text("\(plan.cycle.label) · \(plan.wallet)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 4) {
                Text(MoneyFormat.string(plan.amount, currency: plan.currency))
                    .font(.body.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.primary)
                if plan.active {
                    DueBadge(status: SubscriptionMath.status(of: plan))
                } else {
                    Text("Paused").font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                }
            }
        }
        .opacity(plan.active ? 1 : 0.55)
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

struct SubscriptionFormView: View {
    /// nil to add a new subscription.
    let plan: SubscriptionPlan?

    @Environment(DataStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var amountText: String
    @State private var walletName: String
    @State private var category: String
    @State private var cycle: BillingCycle
    @State private var nextDate: Date
    @State private var note: String
    @State private var active: Bool
    @State private var errorMessage: String?

    init(plan: SubscriptionPlan?) {
        self.plan = plan
        let calendar = Calendar.current
        let nextMonth = calendar.date(byAdding: .month, value: 1, to: Date()) ?? Date()
        let firstOfNextMonth = calendar.dateInterval(of: .month, for: nextMonth)?.start ?? nextMonth
        _name = State(initialValue: plan?.name ?? "")
        _amountText = State(initialValue: plan.map { MoneyFormat.editableString($0.amount, currency: $0.currency) } ?? "")
        _walletName = State(initialValue: plan?.wallet ?? "")
        _category = State(initialValue: plan?.category ?? "")
        _cycle = State(initialValue: plan?.cycle ?? .monthly)
        _nextDate = State(initialValue: plan?.nextDate ?? firstOfNextMonth)
        _note = State(initialValue: plan?.note ?? "")
        _active = State(initialValue: plan?.active ?? true)
    }

    private var wallet: Wallet? { store.wallet(named: walletName) }

    var body: some View {
        NavigationStack {
            Form {
                if let errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Theme.expense)
                    }
                }
                Section {
                    TextField("Service name (e.g. Netflix, iCloud)", text: $name)
                        .textInputAutocapitalization(.words)
                    HStack {
                        Text(Currencies.symbol(for: wallet?.currency ?? plan?.currency ?? "USD")).foregroundStyle(.secondary)
                        TextField("Amount", text: $amountText)
                            .keyboardType(.decimalPad)
                            .font(.title3.monospacedDigit())
                    }
                    Picker("Billing cycle", selection: $cycle) {
                        ForEach(BillingCycle.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    DatePicker("Next billing date", selection: $nextDate, displayedComponents: .date)
                }
                Section {
                    Picker("Charge wallet", selection: $walletName) {
                        if walletName.isEmpty || wallet == nil { Text("Select").tag(walletName) }
                        ForEach(store.wallets) { w in
                            Text("\(w.name) — \(MoneyFormat.string(w.balance, currency: w.currency))").tag(w.name)
                        }
                    }
                    Picker("Category", selection: $category) {
                        if category.isEmpty { Text("Select").tag("") }
                        ForEach(categoryOptions) { c in
                            Text("\(c.icon) \(c.name)").tag(c.name)
                        }
                    }
                    TextField("Notes", text: $note)
                    Toggle("Active", isOn: $active)
                } footer: {
                    Text("The amount is charged in the wallet's currency.")
                }
            }
            .navigationTitle(plan == nil ? "Add Subscription" : "Edit Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(plan == nil ? "Add" : "Save") { save() }
                }
            }
        }
    }

    private var categoryOptions: [CategoryInfo] {
        var options = Categories.expense
        if !category.isEmpty, !options.contains(where: { $0.name == category }) {
            options.insert(Categories.named(category), at: 0)
        }
        return options
    }

    private func save() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { errorMessage = "Enter a name."; return }
        guard let amount = MoneyFormat.parseAmount(amountText) else { errorMessage = "Enter an amount greater than 0."; return }
        guard let wallet else { errorMessage = "Select a wallet."; return }
        guard !category.isEmpty else { errorMessage = "Select a category."; return }

        let saved = SubscriptionPlan(
            id: plan?.id ?? "",
            name: trimmedName,
            amount: amount,
            currency: wallet.currency,
            wallet: wallet.name,
            category: category,
            cycle: cycle,
            nextDate: nextDate,
            active: active,
            note: note.trimmingCharacters(in: .whitespaces)
        )
        if plan == nil {
            store.addSubscription(saved)
        } else {
            store.updateSubscription(saved)
        }
        Haptics.success()
        dismiss()
    }
}
