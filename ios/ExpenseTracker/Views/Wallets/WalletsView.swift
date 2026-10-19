import ExpenseTrackerKit
import SwiftUI

struct WalletsView: View {
    @Environment(DataStore.self) private var store
    @Environment(ExchangeRateService.self) private var rates
    @State private var addingWallet = false
    @State private var transferring = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    PortfolioCard(wallets: store.wallets, rates: rates.rates)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                if store.wallets.isEmpty {
                    ContentUnavailableView {
                        Label("No wallets yet", systemImage: "wallet.pass")
                    } description: {
                        Text("Create your first wallet — cash, a bank account or a card.")
                    } actions: {
                        Button("Add Wallet") { addingWallet = true }
                            .buttonStyle(.borderedProminent)
                    }
                    .listRowBackground(Color.clear)
                } else {
                    Section("Wallets") {
                        ForEach(store.wallets) { wallet in
                            NavigationLink(value: wallet.id) {
                                WalletRow(wallet: wallet)
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Wallets")
            .navigationDestination(for: String.self) { id in
                WalletDetailView(walletID: id)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Transfer", systemImage: "arrow.left.arrow.right") { transferring = true }
                        .disabled(store.wallets.count < 2)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Add Wallet", systemImage: "plus.circle.fill") { addingWallet = true }
                }
            }
            .sheet(isPresented: $addingWallet) {
                WalletFormView(wallet: nil)
            }
            .sheet(isPresented: $transferring) {
                TransferView()
            }
        }
    }
}

private struct PortfolioCard: View {
    let wallets: [Wallet]
    let rates: ExchangeRates

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Portfolio")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white.opacity(0.85))
            Text(MoneyFormat.string(Stats.portfolioValue(wallets, in: "USD", rates: rates), currency: "USD"))
                .font(.largeTitle.weight(.bold).monospacedDigit())
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text("≈ \(MoneyFormat.string(Stats.portfolioValue(wallets, in: "KHR", rates: rates), currency: "KHR"))")
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.white.opacity(0.85))
            HStack(spacing: 16) {
                countLabel("\(wallets.count)", "wallets")
                countLabel("\(wallets.filter { $0.currency == "USD" }.count)", "USD")
                countLabel("\(wallets.filter { $0.currency == "KHR" }.count)", "KHR")
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [Color(hex: "#a52549"), Color(hex: "#dc5078")], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 20, style: .continuous)
        )
        .accessibilityElement(children: .combine)
    }

    private func countLabel(_ value: String, _ label: String) -> some View {
        HStack(spacing: 4) {
            Text(value).fontWeight(.bold)
            Text(label).opacity(0.85)
        }
        .font(.caption)
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(.white.opacity(0.18), in: Capsule())
    }
}

struct WalletRow: View {
    let wallet: Wallet

    var body: some View {
        HStack(spacing: 12) {
            Text(wallet.kind.emoji)
                .font(.title3)
                .frame(width: 40, height: 40)
                .background(Theme.lotusSoft, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(wallet.name).font(.body.weight(.medium))
                    if wallet.locked {
                        Image(systemName: "lock.fill")
                            .font(.caption)
                            .foregroundStyle(.orange)
                            .accessibilityLabel("Locked")
                    }
                }
                Text("\(wallet.kind.label) · \(wallet.currency)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(MoneyFormat.string(wallet.balance, currency: wallet.currency))
                .font(.body.weight(.semibold).monospacedDigit())
                .foregroundStyle(wallet.balance < 0 ? Theme.expense : Theme.income)
        }
        .padding(.vertical, 2)
    }
}
