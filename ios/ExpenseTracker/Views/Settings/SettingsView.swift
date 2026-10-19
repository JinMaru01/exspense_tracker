import ExpenseTrackerKit
import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(AuthService.self) private var auth
    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @Environment(\.dismiss) private var dismiss

    @AppStorage(ReminderScheduler.Keys.subscriptions) private var remindSubscriptions = false
    @AppStorage(ReminderScheduler.Keys.daily) private var remindDaily = false
    @AppStorage(ReminderScheduler.Keys.dailyHour) private var dailyHour = ReminderScheduler.defaultDailyHour

    @State private var notificationsDenied = false
    @State private var importing = false
    @State private var pendingImport: CSVImportResult?
    @State private var importMessage: String?
    @State private var confirmingClear = false
    @State private var confirmingSignOut = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        AvatarView(account: auth.account, size: 52)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(auth.account?.displayName ?? "Signed in").font(.headline)
                            if let email = auth.account?.email {
                                Text(email).font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                } footer: {
                    Text("Changes sync in real time with the web app and your other devices.")
                }

                Section {
                    Toggle("Subscription due dates", isOn: $remindSubscriptions)
                    Toggle("Daily logging reminder", isOn: $remindDaily)
                    if remindDaily {
                        Picker("Remind at", selection: $dailyHour) {
                            ForEach(17..<24, id: \.self) { hour in
                                Text(hourLabel(hour)).tag(hour)
                            }
                        }
                    }
                } header: {
                    Text("Reminders")
                } footer: {
                    if notificationsDenied {
                        Text("Notifications are turned off for this app. Enable them in the Settings app.")
                            .foregroundStyle(Theme.expense)
                    } else {
                        Text("The daily reminder is skipped on days you've already logged something.")
                    }
                }

                Section("Data") {
                    Button("Import CSV…", systemImage: "square.and.arrow.down") { importing = true }
                    LabeledContent("Exchange rate") {
                        Text("1 USD = \(MoneyFormat.string(rates.rates.rate(for: "KHR"), currency: "KHR"))")
                    }
                    Button("Refresh Exchange Rates", systemImage: "arrow.clockwise") {
                        Task { await rates.refresh() }
                    }
                    .disabled(rates.isRefreshing)
                }

                Section {
                    Button("Clear All Data", systemImage: "trash", role: .destructive) { confirmingClear = true }
                } footer: {
                    Text("Permanently deletes all your transactions, wallets and subscriptions from the cloud.")
                }

                Section {
                    Button("Sign Out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                        confirmingSignOut = true
                    }
                } footer: {
                    Text("🪷 Your data is private. Only you can see it.")
                        .frame(maxWidth: .infinity)
                        .padding(.top, 12)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onChange(of: remindSubscriptions) { _, enabled in
                if enabled { ensurePermission { remindSubscriptions = false } }
            }
            .onChange(of: remindDaily) { _, enabled in
                if enabled { ensurePermission { remindDaily = false } }
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.commaSeparatedText, .plainText]) { result in
                readImport(result)
            }
            .alert(
                importTitle,
                isPresented: Binding(isPresent: $pendingImport),
                presenting: pendingImport
            ) { result in
                if result.entries.isEmpty {
                    Button("OK", role: .cancel) {}
                } else {
                    Button("Import") {
                        store.importEntries(result.entries)
                        Haptics.success()
                    }
                    Button("Cancel", role: .cancel) {}
                }
            } message: { result in
                Text(importSummary(result))
            }
            .alert("Import failed", isPresented: Binding(isPresent: $importMessage)) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(importMessage ?? "")
            }
            .confirmationDialog("Clear all data?", isPresented: $confirmingClear, titleVisibility: .visible) {
                Button("Yes, Delete Everything", role: .destructive) {
                    store.clearAllData()
                    dismiss()
                }
            } message: {
                Text("This will permanently delete all your expenses, wallets, and subscriptions from the cloud. This cannot be undone.")
            }
            .confirmationDialog("Sign out?", isPresented: $confirmingSignOut, titleVisibility: .visible) {
                Button("Sign Out", role: .destructive) { auth.signOut() }
            }
            .task {
                if remindSubscriptions || remindDaily {
                    notificationsDenied = await !ReminderScheduler.isAuthorized()
                }
            }
        }
    }

    private var importTitle: String {
        guard let pendingImport else { return "" }
        return pendingImport.entries.isEmpty
            ? "Nothing new to import"
            : "Import \(pendingImport.entries.count) transaction\(pendingImport.entries.count == 1 ? "" : "s")?"
    }

    private func importSummary(_ result: CSVImportResult) -> String {
        var parts: [String] = []
        if result.duplicates > 0 { parts.append("\(result.duplicates) already in your data") }
        if result.invalid > 0 { parts.append("\(result.invalid) unreadable row\(result.invalid == 1 ? "" : "s")") }
        let skipped = parts.isEmpty ? "" : "Skipping \(parts.joined(separator: " and ")). "
        return skipped + (result.entries.isEmpty ? "" : "Imported records don't change wallet balances.")
    }

    private func readImport(_ result: Result<URL, Error>) {
        do {
            let url = try result.get()
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            let data = try Data(contentsOf: url)
            guard let text = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) else {
                importMessage = "The file isn't readable text."
                return
            }
            pendingImport = try CSVImport.entries(from: text, existing: store.expenses)
        } catch {
            importMessage = error.localizedDescription
        }
    }

    private func ensurePermission(onDenied: @escaping () -> Void) {
        Task {
            let granted = await ReminderScheduler.requestPermission()
            notificationsDenied = !granted
            if !granted { onDenied() }
        }
    }

    private func hourLabel(_ hour: Int) -> String {
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: Date()) ?? Date()
        return date.formatted(date: .omitted, time: .shortened)
    }
}
