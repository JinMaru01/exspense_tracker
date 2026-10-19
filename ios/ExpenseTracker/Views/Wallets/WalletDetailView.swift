import ExpenseTrackerKit
import SwiftUI

struct WalletDetailView: View {
    let walletID: String

    @Environment(DataStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var editing = false
    @State private var adjusting = false
    @State private var transferring = false
    @State private var confirmingLock = false
    @State private var confirmingDelete = false
    @State private var editingEntry: Expense?

    var body: some View {
        if let wallet = store.wallet(id: walletID) {
            content(wallet)
        } else {
            ContentUnavailableView("Wallet not found", systemImage: "wallet.pass", description: Text("It may have been deleted on another device."))
        }
    }

    private func content(_ wallet: Wallet) -> some View {
        let entries = store.entries(for: wallet)
        let spent = entries.filter { $0.type == .expense && $0.wallet == wallet.name }.reduce(0) { $0 + $1.amount }
        let received = entries.filter { $0.type == .income && $0.wallet == wallet.name }.reduce(0) { $0 + $1.amount }

        return List {
            Section {
                VStack(spacing: 6) {
                    Text(wallet.kind.emoji).font(.largeTitle)
                    Text(MoneyFormat.string(wallet.balance, currency: wallet.currency))
                        .font(.largeTitle.weight(.bold).monospacedDigit())
                        .foregroundStyle(wallet.balance < 0 ? Theme.expense : .primary)
                    Text("\(wallet.kind.label) · \(wallet.currency)\(wallet.locked ? " · 🔒 Locked" : "")")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }

            Section {
                Button("Adjust Balance", systemImage: "plusminus.circle") { adjusting = true }
                Button("Transfer From This Wallet", systemImage: "arrow.left.arrow.right") { transferring = true }
                    .disabled(store.wallets.count < 2)
                Button("Edit Wallet", systemImage: "pencil") { editing = true }
                Button(wallet.locked ? "Unlock Wallet" : "Lock Wallet", systemImage: wallet.locked ? "lock.open" : "lock") {
                    confirmingLock = true
                }
            }

            Section("Activity") {
                LabeledContent("Spent", value: MoneyFormat.string(spent, currency: wallet.currency))
                LabeledContent("Received", value: MoneyFormat.string(received, currency: wallet.currency))
                LabeledContent("Transactions", value: "\(entries.count)")
            }

            if !entries.isEmpty {
                Section("Recent") {
                    ForEach(entries.prefix(25)) { entry in
                        Button {
                            editingEntry = entry
                        } label: {
                            TransactionRow(entry: entry)
                        }
                    }
                }
            }

            Section {
                Button("Delete Wallet", systemImage: "trash", role: .destructive) { confirmingDelete = true }
                    .disabled(!store.canDelete(wallet))
            } footer: {
                if !store.canDelete(wallet) {
                    Text("Wallets with transactions can't be deleted.")
                }
            }
        }
        .navigationTitle(wallet.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $editing) { WalletFormView(wallet: wallet) }
        .sheet(isPresented: $adjusting) { BalanceAdjustmentView(wallet: wallet) }
        .sheet(isPresented: $transferring) { TransferView(fromWalletID: wallet.id) }
        .sheet(item: $editingEntry) { EntryFormView(mode: .edit($0)) }
        .confirmationDialog(
            wallet.locked ? "Unlock this wallet?" : "Lock this wallet?",
            isPresented: $confirmingLock,
            titleVisibility: .visible
        ) {
            Button(wallet.locked ? "Unlock" : "Lock") { store.setLocked(wallet, !wallet.locked) }
        } message: {
            Text(wallet.locked
                ? "Transactions will no longer require confirmation."
                : "Any transaction from this wallet will require confirmation.")
        }
        .confirmationDialog("Delete \(wallet.name)?", isPresented: $confirmingDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                if store.deleteWallet(wallet) == nil { dismiss() }
            }
        } message: {
            Text("This cannot be undone.")
        }
    }
}
