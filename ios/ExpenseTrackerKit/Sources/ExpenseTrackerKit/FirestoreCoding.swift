import Foundation

// Conversion between the model types and Firestore field dictionaries.
//
// Field names and value shapes match what the web app (hooks/use-firebase-data.ts) writes, so
// documents round-trip between the two clients. Decoding is lenient: older documents may be
// missing `type`, carry dates as strings, or store integers where doubles are expected.
//
// The app layer converts Firestore `Timestamp`s to `Date` before calling `init?(id:fields:)`;
// `Date` values in `firestoreFields` are stored by the Firestore SDK as timestamps.

public enum FieldValueCoding {
    public static func double(_ value: Any?) -> Double? {
        switch value {
        case let v as Double: v
        case let v as Int: Double(v)
        case let v as Int64: Double(v)
        case let v as Float: Double(v)
        case let v as NSNumber: v.doubleValue
        case let v as String: Double(v.trimmingCharacters(in: .whitespaces))
        default: nil
        }
    }

    public static func string(_ value: Any?) -> String? {
        switch value {
        case let v as String: v
        case let v as NSNumber: v.stringValue
        default: nil
        }
    }

    public static func bool(_ value: Any?) -> Bool? {
        switch value {
        case let v as Bool: v
        case let v as NSNumber: v.boolValue
        case let v as String: ["true", "1", "yes"].contains(v.lowercased())
        default: nil
        }
    }

    public static func date(_ value: Any?) -> Date? {
        switch value {
        case let v as Date:
            return v
        case let v as String:
            return parseDateString(v)
        case let v as [String: Any]:
            // A serialized Timestamp: {seconds, nanoseconds} or {_seconds, _nanoseconds}
            guard let seconds = double(v["seconds"] ?? v["_seconds"]) else { return nil }
            let nanos = double(v["nanoseconds"] ?? v["_nanoseconds"]) ?? 0
            return Date(timeIntervalSince1970: seconds + nanos / 1_000_000_000)
        default:
            // Epoch numbers: JS writes milliseconds, anything smaller is seconds.
            guard let n = double(value) else { return nil }
            return Date(timeIntervalSince1970: n > 100_000_000_000 ? n / 1000 : n)
        }
    }

    private static func parseDateString(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: string) { return d }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: string) { return d }
        let day = DateFormatter()
        day.locale = Locale(identifier: "en_US_POSIX")
        day.dateFormat = "yyyy-MM-dd"
        return day.date(from: String(string.prefix(10)))
    }
}

public extension Expense {
    init(id: String, fields: [String: Any]) {
        typealias C = FieldValueCoding
        self.init(
            id: id,
            amount: C.double(fields["amount"]) ?? 0,
            category: C.string(fields["category"]) ?? "",
            wallet: C.string(fields["wallet"]) ?? "",
            note: C.string(fields["description"]) ?? "",
            date: C.date(fields["date"]) ?? Date(timeIntervalSince1970: 0),
            currency: C.string(fields["currency"]) ?? "USD",
            type: C.string(fields["type"]).flatMap(EntryType.init(rawValue:)) ?? .expense,
            toWallet: C.string(fields["toWallet"]),
            convertedAmount: C.double(fields["convertedAmount"])
        )
    }

    var firestoreFields: [String: Any] {
        var fields: [String: Any] = [
            "amount": amount,
            "category": category,
            "wallet": wallet,
            "description": note,
            "date": date,
            "currency": currency,
            "type": type.rawValue,
        ]
        if let toWallet { fields["toWallet"] = toWallet }
        if let convertedAmount { fields["convertedAmount"] = convertedAmount }
        return fields
    }
}

public extension Wallet {
    init(id: String, fields: [String: Any]) {
        typealias C = FieldValueCoding
        self.init(
            id: id,
            name: C.string(fields["name"]) ?? "Wallet",
            balance: C.double(fields["balance"]) ?? 0,
            currency: C.string(fields["currency"]) ?? "USD",
            type: C.string(fields["type"]) ?? WalletKind.other.rawValue,
            exchangeRate: C.double(fields["exchangeRate"]),
            locked: C.bool(fields["locked"]) ?? false
        )
    }

    var firestoreFields: [String: Any] {
        var fields: [String: Any] = [
            "name": name,
            "balance": balance,
            "currency": currency,
            "type": type,
            "locked": locked,
        ]
        if let exchangeRate { fields["exchangeRate"] = exchangeRate }
        return fields
    }
}

public extension SubscriptionPlan {
    init(id: String, fields: [String: Any]) {
        typealias C = FieldValueCoding
        self.init(
            id: id,
            name: C.string(fields["name"]) ?? "",
            amount: C.double(fields["amount"]) ?? 0,
            currency: C.string(fields["currency"]) ?? "USD",
            wallet: C.string(fields["wallet"]) ?? "",
            category: C.string(fields["category"]) ?? "",
            cycle: C.string(fields["cycle"]).flatMap(BillingCycle.init(rawValue:)) ?? .monthly,
            nextDate: C.date(fields["nextDate"]) ?? Date(),
            active: C.bool(fields["active"]) ?? true,
            note: C.string(fields["description"]) ?? ""
        )
    }

    var firestoreFields: [String: Any] {
        [
            "name": name,
            "amount": amount,
            "currency": currency,
            "wallet": wallet,
            "category": category,
            "cycle": cycle.rawValue,
            "nextDate": nextDate,
            "active": active,
            "description": note,
        ]
    }
}
