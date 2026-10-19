import Foundation

public struct CurrencyInfo: Identifiable, Hashable, Sendable {
    public let code: String
    public let symbol: String
    public let name: String
    /// Units of this currency per 1 USD, used until live rates load.
    public let fallbackRate: Double

    public var id: String { code }
}

public enum Currencies {
    /// Mirrors `currencies` in data/currency-data.ts.
    public static let all: [CurrencyInfo] = [
        CurrencyInfo(code: "KHR", symbol: "៛", name: "Cambodian Riel", fallbackRate: 4100),
        CurrencyInfo(code: "USD", symbol: "$", name: "US Dollar", fallbackRate: 1),
    ]

    public static func info(for code: String) -> CurrencyInfo? {
        all.first { $0.code == code }
    }

    public static func symbol(for code: String) -> String {
        info(for: code)?.symbol ?? code
    }
}

/// Rate table of "units of <code> per 1 USD". Every conversion goes through USD,
/// exactly like `convertCurrency` in the web app.
public struct ExchangeRates: Equatable, Sendable {
    public private(set) var unitsPerUSD: [String: Double]

    public init(unitsPerUSD: [String: Double]) {
        self.unitsPerUSD = unitsPerUSD
    }

    public static let fallback = ExchangeRates(
        unitsPerUSD: Dictionary(uniqueKeysWithValues: Currencies.all.map { ($0.code, $0.fallbackRate) })
    )

    public func rate(for code: String) -> Double {
        guard let r = unitsPerUSD[code], r > 0 else { return 1 }
        return r
    }

    /// How many `to` units one `from` unit buys.
    public func rate(from: String, to: String) -> Double {
        from == to ? 1 : rate(for: to) / rate(for: from)
    }

    public func convert(_ amount: Double, from: String, to: String) -> Double {
        from == to ? amount : amount / rate(for: from) * rate(for: to)
    }

    /// Overlays freshly fetched rates (ignoring non-positive values).
    public mutating func merge(_ rates: [String: Double]) {
        for (code, value) in rates where value > 0 {
            unitsPerUSD[code] = value
        }
    }
}

public enum MoneyFormat {
    /// KHR has no minor unit in practice; everything else shows cents.
    public static func fractionDigits(for code: String) -> Int {
        code == "KHR" ? 0 : 2
    }

    /// `$1,234.50`, `៛12,000`, `-$3.00`.
    public static func string(_ amount: Double, currency code: String) -> String {
        let digits = fractionDigits(for: code)
        let scale = pow(10, Double(digits))
        let magnitude = (abs(amount) * scale).rounded() / scale
        let sign = amount < 0 && magnitude > 0 ? "-" : ""
        let body = number(magnitude, fractionDigits: digits)
        guard let info = Currencies.info(for: code) else { return "\(sign)\(body) \(code)" }
        return sign + info.symbol + body
    }

    /// Amount prefixed the way transaction lists show it: `+` income, `-` expense, bare transfer.
    public static func signed(_ amount: Double, currency code: String, type: EntryType) -> String {
        let body = string(abs(amount), currency: code)
        switch type {
        case .income: return "+" + body
        case .expense: return "-" + body
        case .transfer: return body
        }
    }

    /// Grouped en-US number without a currency symbol.
    public static func number(_ value: Double, fractionDigits digits: Int) -> String {
        let formatter = switch digits {
        case 0: wholeFormatter
        case 2: centsFormatter
        default: makeFormatter(fractionDigits: digits)
        }
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    // NumberFormatter is costly to create and safe to share for formatting once configured.
    private static let wholeFormatter = makeFormatter(fractionDigits: 0)
    private static let centsFormatter = makeFormatter(fractionDigits: 2)

    private static func makeFormatter(fractionDigits digits: Int) -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.numberStyle = .decimal
        formatter.usesGroupingSeparator = true
        formatter.minimumFractionDigits = digits
        formatter.maximumFractionDigits = digits
        return formatter
    }

    /// Ungrouped string for pre-filling an amount field, e.g. `12.5` or `12000`.
    public static func editableString(_ amount: Double, currency code: String, locale: Locale = .current) -> String {
        let formatter = NumberFormatter()
        formatter.locale = locale
        formatter.numberStyle = .decimal
        formatter.usesGroupingSeparator = false
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = fractionDigits(for: code)
        return formatter.string(from: NSNumber(value: amount)) ?? String(amount)
    }

    /// Parses typed input such as `1,234.5` or `12000` in the user's locale;
    /// nil for anything that isn't a positive, finite number.
    public static func parseAmount(_ text: String, locale: Locale = .current) -> Double? {
        guard let value = parseNumber(text, locale: locale), value > 0 else { return nil }
        return value
    }

    /// Like `parseAmount` but also accepts zero and negative numbers.
    public static func parseNumber(_ text: String, locale: Locale = .current) -> Double? {
        var cleaned = text.filter { !$0.isWhitespace }
        let decimal = locale.decimalSeparator ?? "."
        if decimal == "." {
            cleaned = cleaned.replacingOccurrences(of: ",", with: "")
        } else {
            if let group = locale.groupingSeparator, !group.isEmpty {
                cleaned = cleaned.replacingOccurrences(of: group, with: "")
            }
            cleaned = cleaned.replacingOccurrences(of: decimal, with: ".")
        }
        guard let value = Double(cleaned), value.isFinite else { return nil }
        return value
    }
}
