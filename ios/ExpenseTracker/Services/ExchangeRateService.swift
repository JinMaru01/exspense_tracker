import ExpenseTrackerKit
import Foundation
import Observation

/// Live USD-based exchange rates from the same free API the web app uses, cached for six hours.
/// Until the first fetch succeeds, the static fallback (1 USD = 4,100 KHR) applies.
@MainActor
@Observable
final class ExchangeRateService {
    private(set) var rates: ExchangeRates
    private(set) var lastUpdated: Date?
    private(set) var isRefreshing = false

    private static let endpoint = URL(string: "https://api.exchangerate-api.com/v4/latest/USD")!
    private static let cacheKey = "fx_rates"
    private static let timestampKey = "fx_rates_ts"
    private static let maxAge: TimeInterval = 6 * 60 * 60

    init() {
        var rates = ExchangeRates.fallback
        var updated: Date?
        let defaults = UserDefaults.standard
        if let data = defaults.data(forKey: Self.cacheKey),
           let cached = try? JSONDecoder().decode([String: Double].self, from: data) {
            rates.merge(cached)
            updated = defaults.object(forKey: Self.timestampKey) as? Date
        }
        self.rates = rates
        self.lastUpdated = updated
    }

    func refreshIfStale() async {
        if let lastUpdated, Date().timeIntervalSince(lastUpdated) < Self.maxAge { return }
        await refresh()
    }

    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            let (data, response) = try await URLSession.shared.data(from: Self.endpoint)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
            let latest = try JSONDecoder().decode(RatesResponse.self, from: data).rates
            guard latest["USD"] != nil else { return }
            rates.merge(latest)
            lastUpdated = Date()
            UserDefaults.standard.set(try JSONEncoder().encode(rates.unitsPerUSD), forKey: Self.cacheKey)
            UserDefaults.standard.set(lastUpdated, forKey: Self.timestampKey)
        } catch {
            // Offline or API down: keep cached/fallback rates.
        }
    }

    private struct RatesResponse: Decodable {
        let rates: [String: Double]
    }
}
