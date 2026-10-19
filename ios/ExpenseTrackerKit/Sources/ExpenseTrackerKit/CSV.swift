import Foundation

/// Minimal RFC 4180 reader/writer.
public enum CSV {
    public static func escape(_ field: String) -> String {
        guard field.contains(where: { $0 == "," || $0 == "\"" || $0 == "\n" || $0 == "\r" }) else { return field }
        return "\"" + field.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }

    public static func line(_ fields: [String]) -> String {
        fields.map(escape).joined(separator: ",")
    }

    /// Splits text into rows of fields. Handles quoted commas, doubled quotes, quoted
    /// line breaks and CRLF endings. Blank lines are dropped.
    public static func parse(_ text: String) -> [[String]] {
        var rows: [[String]] = []
        var row: [String] = []
        var field = ""
        var inQuotes = false
        var chars = text.unicodeScalars.makeIterator()
        var pending = chars.next()

        func endRow() {
            row.append(field)
            if !(row.count == 1 && row[0].trimmingCharacters(in: .whitespaces).isEmpty) {
                rows.append(row)
            }
            row = []
            field = ""
        }

        while let c = pending {
            pending = chars.next()
            if inQuotes {
                if c == "\"" {
                    if pending == "\"" {
                        field.unicodeScalars.append("\"")
                        pending = chars.next()
                    } else {
                        inQuotes = false
                    }
                } else {
                    field.unicodeScalars.append(c)
                }
                continue
            }
            switch c {
            case "\"":
                inQuotes = true
            case ",":
                row.append(field)
                field = ""
            case "\r":
                if pending == "\n" { pending = chars.next() }
                endRow()
            case "\n":
                endRow()
            default:
                field.unicodeScalars.append(c)
            }
        }
        if !field.isEmpty || !row.isEmpty { endRow() }
        return rows
    }
}

public enum CSVExport {
    /// Same columns as the web export plus `Type`, which the web importer also understands,
    /// so income and transfers survive a round trip.
    public static func expenses(_ entries: [Expense], calendar: Calendar = .current) -> String {
        let header = ["Date", "Category", "Description", "Wallet", "Amount", "Currency", "Type"]
        let rows = entries.map { e in
            [dayString(e.date, calendar: calendar), e.category, e.note, e.wallet, amountString(e.amount), e.currency, e.type.rawValue]
        }
        return ([header] + rows).map(CSV.line).joined(separator: "\n")
    }

    public static func subscriptions(_ subscriptions: [SubscriptionPlan], calendar: Calendar = .current) -> String {
        let header = ["Name", "Amount", "Currency", "Cycle", "NextDate", "Wallet", "Category", "Active"]
        let rows = subscriptions.map { s in
            [s.name, amountString(s.amount), s.currency, s.cycle.rawValue, dayString(s.nextDate, calendar: calendar),
             s.wallet, s.category, s.active ? "true" : "false"]
        }
        return ([header] + rows).map(CSV.line).joined(separator: "\n")
    }

    /// `DD/MM/YYYY`
    public static func dayString(_ date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%02d/%02d/%04d", c.day ?? 0, c.month ?? 0, c.year ?? 0)
    }

    /// `16`, `3.99` — like JavaScript's `Number.toString()` for typical amounts.
    public static func amountString(_ amount: Double) -> String {
        if amount == amount.rounded(), abs(amount) < 1e15 {
            return String(Int64(amount))
        }
        return String(amount)
    }
}

public struct CSVImportResult: Sendable {
    public var entries: [Expense]
    /// Rows skipped because an identical record already exists.
    public var duplicates: Int
    /// Rows skipped because the date or amount couldn't be read.
    public var invalid: Int
}

public enum CSVImportError: LocalizedError, Equatable {
    case empty
    case missingColumns

    public var errorDescription: String? {
        switch self {
        case .empty: "CSV file must contain headers and at least one data row"
        case .missingColumns: "CSV must contain columns: Date, Category, Description, Wallet, Amount, Currency"
        }
    }
}

/// Port of utils/csv-import.ts: same columns, date-format detection, type inference and
/// duplicate check, so a file that imports on the web imports identically here.
public enum CSVImport {
    static let incomeCategories: Set<String> = [
        "salary", "income", "income/deposit", "gift", "refund",
        "freelance", "business", "investment", "other income", "bonus",
    ]

    enum DateOrder { case dayMonth, monthDay }

    public static func entries(from text: String, existing: [Expense], calendar: Calendar = .current) throws -> CSVImportResult {
        var rows = CSV.parse(text)
        guard rows.count >= 2 else { throw CSVImportError.empty }

        let header = rows.removeFirst().map {
            $0.replacingOccurrences(of: "\u{FEFF}", with: "").trimmingCharacters(in: .whitespaces).lowercased()
        }
        func column(_ name: String) -> Int? { header.firstIndex(of: name) }
        guard let dateIdx = column("date"), let categoryIdx = column("category"),
              let descriptionIdx = column("description"), let walletIdx = column("wallet"),
              let amountIdx = column("amount"), let currencyIdx = column("currency")
        else { throw CSVImportError.missingColumns }
        let typeIdx = column("type")
        let required = max(dateIdx, categoryIdx, descriptionIdx, walletIdx, amountIdx, currencyIdx)

        let usable = rows.filter { $0.count > required }
        let order = detectOrder(usable.map { $0[dateIdx].trimmingCharacters(in: .whitespaces) })

        var invalid = rows.count - usable.count
        var parsed: [Expense] = []
        for fields in usable {
            func value(_ i: Int) -> String { fields[i].trimmingCharacters(in: .whitespaces) }
            guard let signed = Double(value(amountIdx).replacingOccurrences(of: ",", with: "")),
                  signed.isFinite,
                  let date = parseDate(value(dateIdx), order: order, calendar: calendar)
            else {
                invalid += 1
                continue
            }
            let category = value(categoryIdx)
            let currency = value(currencyIdx)
            parsed.append(Expense(
                amount: abs(signed),
                category: category,
                wallet: value(walletIdx),
                note: value(descriptionIdx),
                date: date,
                currency: currency.isEmpty ? "USD" : currency,
                type: inferType(explicit: typeIdx.flatMap { $0 < fields.count ? value($0) : nil },
                                signedAmount: signed, category: category)
            ))
        }

        let fresh = parsed.filter { new in
            !existing.contains { old in
                old.note == new.note && old.wallet == new.wallet && old.amount == new.amount
                    && calendar.isDate(old.date, inSameDayAs: new.date)
            }
        }
        return CSVImportResult(entries: fresh, duplicates: parsed.count - fresh.count, invalid: invalid)
    }

    static func inferType(explicit: String?, signedAmount: Double, category: String) -> EntryType {
        if let explicit, !explicit.isEmpty {
            switch explicit.lowercased() {
            case "income": return .income
            case "transfer": return .transfer
            default: return .expense
            }
        }
        let cat = category.lowercased()
        if signedAmount < 0 { return .income }
        if cat.contains("transfer") { return .transfer }
        if incomeCategories.contains(cat) { return .income }
        return .expense
    }

    /// A middle part above 12 must be a day (M/D/Y); a first part above 12 must be a day (D/M/Y).
    /// Ambiguous files default to D/M/Y, the format the app exports.
    static func detectOrder(_ dates: [String]) -> DateOrder {
        for d in dates {
            let parts = d.split(separator: "/").compactMap { Int($0) }
            guard parts.count == 3 else { continue }
            if parts[1] > 12 { return .monthDay }
            if parts[0] > 12 { return .dayMonth }
        }
        return .dayMonth
    }

    static func parseDate(_ text: String, order: DateOrder, calendar: Calendar) -> Date? {
        var c = DateComponents()
        let slash = text.split(separator: "/").compactMap { Int($0) }
        let dash = text.prefix(10).split(separator: "-").compactMap { Int($0) }
        if slash.count == 3 {
            (c.day, c.month) = order == .dayMonth ? (slash[0], slash[1]) : (slash[1], slash[0])
            c.year = slash[2] < 100 ? 2000 + slash[2] : slash[2]
        } else if dash.count == 3, dash[0] > 999 {
            (c.year, c.month, c.day) = (dash[0], dash[1], dash[2])
        } else {
            return nil
        }
        guard let date = calendar.date(from: c) else { return nil }
        // Reject rollovers such as 31/02.
        let check = calendar.dateComponents([.year, .month, .day], from: date)
        return check.day == c.day && check.month == c.month && check.year == c.year ? date : nil
    }
}
