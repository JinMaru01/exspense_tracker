import ExpenseTrackerKit
import SwiftUI

struct CurrencyConverterView: View {
    @Environment(ExchangeRateService.self) private var rates
    @State private var amountText = ""
    @State private var from = "USD"
    @State private var to = "KHR"

    var body: some View {
        let amount = MoneyFormat.parseAmount(amountText)
        Form {
            Section {
                TextField("Amount", text: $amountText)
                    .keyboardType(.decimalPad)
                    .font(.title3.monospacedDigit())
                Picker("From", selection: $from) { currencyOptions }
                Picker("To", selection: $to) { currencyOptions }
                Button("Swap Currencies", systemImage: "arrow.up.arrow.down") {
                    (from, to) = (to, from)
                }
            }

            if let amount {
                Section {
                    VStack(spacing: 6) {
                        Text(MoneyFormat.string(amount, currency: from))
                            .foregroundStyle(.secondary)
                        Text(MoneyFormat.string(rates.rates.convert(amount, from: from, to: to), currency: to))
                            .font(.largeTitle.weight(.bold).monospacedDigit())
                            .foregroundStyle(Theme.lotus)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                        Text("1 \(from) = \(MoneyFormat.number(rates.rates.rate(from: from, to: to), fractionDigits: 4)) \(to)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }

            Section {
                RateFootnote()
                Button("Refresh Rates", systemImage: "arrow.clockwise") {
                    Task { await rates.refresh() }
                }
                .disabled(rates.isRefreshing)
            }
        }
        .navigationTitle("Currency Converter")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var currencyOptions: some View {
        ForEach(Currencies.all) { c in
            Text("\(c.symbol) \(c.code) – \(c.name)").tag(c.code)
        }
    }
}
