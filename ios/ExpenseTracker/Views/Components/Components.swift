import ExpenseTrackerKit
import SwiftUI

/// Rounded card used on the dashboard and reports.
struct Card<Content: View>: View {
    var title: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                Text(title).font(.headline)
            }
            content
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let color: Color
    let systemImage: String
    var footnote: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: systemImage)
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title3.weight(.bold).monospacedDigit())
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if let footnote {
                Text(footnote).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(alignment: .leading) {
            UnevenRoundedRectangle(topLeadingRadius: 16, bottomLeadingRadius: 16, style: .continuous)
                .fill(color)
                .frame(width: 4)
        }
        .accessibilityElement(children: .combine)
    }
}

struct CategoryIcon: View {
    let category: CategoryInfo
    var size: CGFloat = 38

    var body: some View {
        Text(category.icon)
            .font(.system(size: size * 0.48))
            .frame(width: size, height: size)
            .background(category.color.opacity(0.15), in: Circle())
            .accessibilityHidden(true)
    }
}

struct TransactionRow: View {
    let entry: Expense

    var body: some View {
        HStack(spacing: 12) {
            CategoryIcon(category: Categories.named(entry.category))
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.note.isEmpty ? entry.category : entry.note)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text(MoneyFormat.signed(entry.amount, currency: entry.currency, type: entry.type))
                    .font(.body.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Theme.color(for: entry.type))
                Text(entry.date, format: .dateTime.day().month(.abbreviated))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }

    private var subtitle: String {
        if entry.type == .transfer, let to = entry.toWallet {
            return "\(entry.wallet) → \(to)"
        }
        return "\(entry.category) · \(entry.wallet)"
    }
}

struct DueBadge: View {
    let status: DueStatus

    var body: some View {
        Text(status.label)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .foregroundStyle(color)
            .background(color.opacity(0.15), in: Capsule())
    }

    private var color: Color {
        switch status {
        case .overdue, .today: Theme.expense
        case .soon: .orange
        case .thisWeek: .yellow
        case .later: .secondary
        }
    }
}

struct ShareBar: View {
    let fraction: Double
    let color: Color

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.15))
                Capsule().fill(color).frame(width: max(4, geo.size.width * min(max(fraction, 0), 1)))
            }
        }
        .frame(height: 6)
    }
}

/// Category rows with share-of-total bars, shared by the dashboard and reports.
struct CategoryBreakdownList: View {
    let shares: [CategoryShare]
    let currency: String
    var limit: Int?

    var body: some View {
        if shares.isEmpty {
            Text("No expense data for this period.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 12)
        } else {
            VStack(spacing: 14) {
                ForEach(shares.prefix(limit ?? shares.count)) { share in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("\(share.category.icon) \(share.category.name)").font(.subheadline)
                            Spacer()
                            Text(MoneyFormat.string(share.total, currency: currency))
                                .font(.subheadline.weight(.semibold).monospacedDigit())
                            Text(String(format: "%.1f%%", share.percent))
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                                .frame(width: 48, alignment: .trailing)
                        }
                        ShareBar(fraction: share.percent / 100, color: share.category.color)
                    }
                }
            }
        }
    }
}

struct LotusBadge: View {
    var size: CGFloat = 44

    var body: some View {
        Text("🪷")
            .font(.system(size: size * 0.55))
            .frame(width: size, height: size)
            .background(Theme.lotusSoft, in: RoundedRectangle(cornerRadius: size * 0.3, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: size * 0.3, style: .continuous).stroke(Theme.lotusBorder))
            .accessibilityHidden(true)
    }
}

struct AvatarView: View {
    let account: Account?
    var size: CGFloat = 32

    var body: some View {
        AsyncImage(url: account?.photoURL) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Image(systemName: "person.fill")
                .font(.system(size: size * 0.5))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Theme.lotus)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}

/// Period menu with presets plus a custom date range sheet.
struct PeriodPicker: View {
    @Binding var period: Period
    @State private var showingCustom = false

    var body: some View {
        Menu {
            ForEach(Period.presets, id: \.self) { preset in
                Button {
                    period = preset
                } label: {
                    if period == preset {
                        Label(preset.title, systemImage: "checkmark")
                    } else {
                        Text(preset.title)
                    }
                }
            }
            Divider()
            Button("Custom Range…", systemImage: "calendar") { showingCustom = true }
        } label: {
            Label(label, systemImage: "calendar")
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Theme.lotusSoft, in: Capsule())
                .overlay(Capsule().stroke(Theme.lotusBorder))
        }
        .sheet(isPresented: $showingCustom) {
            CustomRangeSheet(initial: period) { period = $0 }
        }
    }

    private var label: String {
        if case let .custom(start, end) = period {
            let style = Date.FormatStyle.dateTime.day().month(.abbreviated)
            return "\(start.formatted(style)) – \(end.formatted(style))"
        }
        return period.title
    }
}

private struct CustomRangeSheet: View {
    let onApply: (Period) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var start: Date
    @State private var end: Date

    init(initial: Period, onApply: @escaping (Period) -> Void) {
        self.onApply = onApply
        if case let .custom(s, e) = initial {
            _start = State(initialValue: s)
            _end = State(initialValue: e)
        } else {
            let today = Date()
            _start = State(initialValue: Calendar.current.date(byAdding: .day, value: -30, to: today) ?? today)
            _end = State(initialValue: today)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("From", selection: $start, in: ...end, displayedComponents: .date)
                DatePicker("To", selection: $end, in: start..., displayedComponents: .date)
            }
            .navigationTitle("Custom Range")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        onApply(.custom(start: start, end: end))
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct CurrencyToggle: View {
    @Binding var currency: String

    var body: some View {
        Picker("Display currency", selection: $currency) {
            ForEach(Currencies.all) { c in
                Text("\(c.code) (\(c.symbol))").tag(c.code)
            }
        }
        .pickerStyle(.segmented)
        .fixedSize()
    }
}

// MARK: - Quick add

enum QuickAction: String, Identifiable {
    case expense, income, transfer
    var id: String { rawValue }
}

/// Adds the "+" menu (expense, income, transfer) to a screen's toolbar along with its sheets.
private struct QuickAddModifier: ViewModifier {
    @State private var action: QuickAction?

    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button("Add Expense", systemImage: "minus.circle") { action = .expense }
                        Button("Add Income", systemImage: "plus.circle") { action = .income }
                        Button("Transfer", systemImage: "arrow.left.arrow.right") { action = .transfer }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .accessibilityLabel("Add")
                    }
                }
            }
            .sheet(item: $action) { action in
                switch action {
                case .expense: EntryFormView(mode: .add(.expense))
                case .income: EntryFormView(mode: .add(.income))
                case .transfer: TransferView()
                }
            }
    }
}

extension View {
    func quickAddToolbar() -> some View {
        modifier(QuickAddModifier())
    }
}
