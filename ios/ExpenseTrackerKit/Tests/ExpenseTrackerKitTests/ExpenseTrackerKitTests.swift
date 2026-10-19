import XCTest
@testable import ExpenseTrackerKit

private var utc: Calendar = {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = TimeZone(identifier: "UTC")!
    return c
}()

private func day(_ y: Int, _ m: Int, _ d: Int, _ h: Int = 12) -> Date {
    utc.date(from: DateComponents(year: y, month: m, day: d, hour: h))!
}

private let cash = Wallet(id: "w1", name: "Cash", balance: 100, currency: "USD")
private let riel = Wallet(id: "w2", name: "Riel", balance: 41_000, currency: "KHR")

final class FirestoreCodingTests: XCTestCase {
    func testLegacyDocumentWithoutTypeIsExpense() {
        let e = Expense(id: "a", fields: [
            "amount": 12, "category": "Groceries", "wallet": "Cash",
            "description": "Fruit", "date": day(2026, 2, 25), "currency": "USD",
        ])
        XCTAssertEqual(e.type, .expense)
        XCTAssertEqual(e.amount, 12)
        XCTAssertEqual(e.note, "Fruit")
    }

    func testDatesFromStringsAndEpochMilliseconds() {
        XCTAssertEqual(FieldValueCoding.date("2026-02-25T12:00:00.000Z"), day(2026, 2, 25))
        XCTAssertEqual(FieldValueCoding.date(1_772_020_800_000.0), day(2026, 2, 25))
        XCTAssertEqual(FieldValueCoding.date(["seconds": 1_772_020_800, "nanoseconds": 0]), day(2026, 2, 25))
    }

    func testRoundTrip() {
        let t = Expense(id: "x", amount: 10, category: "Transfer", wallet: "Cash", note: "Move",
                        date: day(2026, 3, 1), currency: "USD", type: .transfer, toWallet: "Riel", convertedAmount: 41_000)
        XCTAssertEqual(Expense(id: "x", fields: t.firestoreFields), t)

        let w = Wallet(id: "w", name: "ABA", balance: 5.5, currency: "USD", type: "bank", locked: true)
        XCTAssertEqual(Wallet(id: "w", fields: w.firestoreFields), w)

        let s = SubscriptionPlan(id: "s", name: "Netflix", amount: 9.99, currency: "USD", wallet: "ABA",
                             category: "Entertainment", cycle: .yearly, nextDate: day(2026, 5, 1), active: false, note: "4K")
        XCTAssertEqual(SubscriptionPlan(id: "s", fields: s.firestoreFields), s)
    }

    func testOptionalTransferFieldsAreOmitted() {
        let e = Expense(amount: 1, category: "Food & Dining", wallet: "Cash", date: Date(), currency: "USD")
        XCTAssertNil(e.firestoreFields["toWallet"])
        XCTAssertNil(e.firestoreFields["convertedAmount"])
        XCTAssertEqual(e.firestoreFields["type"] as? String, "expense")
    }
}

final class MoneyTests: XCTestCase {
    func testFormatting() {
        XCTAssertEqual(MoneyFormat.string(1234.5, currency: "USD"), "$1,234.50")
        XCTAssertEqual(MoneyFormat.string(12_000.4, currency: "KHR"), "៛12,000")
        XCTAssertEqual(MoneyFormat.string(-3, currency: "USD"), "-$3.00")
        XCTAssertEqual(MoneyFormat.string(-0.001, currency: "USD"), "$0.00")
        XCTAssertEqual(MoneyFormat.signed(5, currency: "USD", type: .income), "+$5.00")
        XCTAssertEqual(MoneyFormat.signed(5, currency: "USD", type: .expense), "-$5.00")
        XCTAssertEqual(MoneyFormat.number(4100.123456, fractionDigits: 4), "4,100.1235")
    }

    func testParsing() {
        let us = Locale(identifier: "en_US")
        XCTAssertEqual(MoneyFormat.parseAmount("1,234.5", locale: us), 1234.5)
        XCTAssertNil(MoneyFormat.parseAmount("0", locale: us))
        XCTAssertNil(MoneyFormat.parseAmount("abc", locale: us))
        XCTAssertEqual(MoneyFormat.parseAmount("12,5", locale: Locale(identifier: "de_DE")), 12.5)
        XCTAssertEqual(MoneyFormat.parseNumber("0", locale: us), 0)
        XCTAssertEqual(MoneyFormat.parseNumber("-4.5", locale: us), -4.5)
        XCTAssertEqual(MoneyFormat.editableString(12_000, currency: "KHR", locale: us), "12000")
        XCTAssertEqual(MoneyFormat.editableString(3.5, currency: "USD", locale: us), "3.5")
    }

    func testConversionGoesThroughUSD() {
        var rates = ExchangeRates.fallback
        XCTAssertEqual(rates.convert(10, from: "USD", to: "KHR"), 41_000)
        XCTAssertEqual(rates.convert(4100, from: "KHR", to: "USD"), 1)
        rates.merge(["KHR": 4000, "EUR": 0.9, "BAD": 0])
        XCTAssertEqual(rates.rate(from: "KHR", to: "USD"), 1.0 / 4000, accuracy: 1e-12)
        XCTAssertEqual(rates.rate(for: "BAD"), 1)
    }
}

final class LedgerTests: XCTestCase {
    func testEffects() {
        let exp = Expense(amount: 5, category: "Food & Dining", wallet: "Cash", date: Date(), currency: "USD")
        XCTAssertEqual(Ledger.effects(of: exp), ["Cash": -5])
        XCTAssertEqual(Ledger.reversal(of: exp), ["Cash": 5])

        let transfer = Ledger.transferEntry(from: cash, to: riel, amount: 10, convertedAmount: 41_000, note: "", date: Date())
        XCTAssertEqual(Ledger.effects(of: transfer), ["Cash": -10, "Riel": 41_000])
        XCTAssertEqual(transfer.note, "Transfer to Riel (41000.00 KHR)")
        XCTAssertEqual(transfer.category, "Transfer")
    }

    func testEditDeltas() {
        let original = Expense(amount: 5, category: "Food & Dining", wallet: "Cash", date: Date(), currency: "USD")
        var bigger = original
        bigger.amount = 8
        XCTAssertEqual(Ledger.deltas(replacing: original, with: bigger), ["Cash": -3])

        var moved = original
        moved.wallet = "Card"
        XCTAssertEqual(Ledger.deltas(replacing: original, with: moved), ["Cash": 5, "Card": -5])

        XCTAssertEqual(Ledger.deltas(replacing: original, with: original), [:])
    }

    func testAvailableBalanceWhenEditing() {
        let original = Expense(amount: 30, category: "Shopping", wallet: "Cash", date: Date(), currency: "USD")
        // Spending 120 is fine when the 30 already spent from this wallet is given back first.
        XCTAssertNil(Ledger.validateSpend(amount: 120, from: cash, replacing: original))
        XCTAssertEqual(
            Ledger.validateSpend(amount: 131, from: cash, replacing: original),
            "Insufficient balance in \"Cash\". Available: $130.00"
        )
        XCTAssertNil(Ledger.validateSpend(amount: 100, from: cash))
        XCTAssertNotNil(Ledger.validateSpend(amount: 100.01, from: cash))
    }

    func testTransferValidation() {
        XCTAssertEqual(Ledger.validateTransfer(from: cash, to: cash, amount: 1), "Cannot transfer to the same wallet.")
        XCTAssertEqual(Ledger.validateTransfer(from: cash, to: riel, amount: 101), "Insufficient balance in source wallet.")
        XCTAssertNil(Ledger.validateTransfer(from: cash, to: riel, amount: 100))
    }

    func testAdjustmentLogsOnlyWithReason() {
        let silent = Ledger.adjustment(of: cash, amount: 4, direction: .subtract, reason: "  ", date: Date())
        XCTAssertNil(silent.entry)
        XCTAssertEqual(silent.delta, -4)

        let logged = Ledger.adjustment(of: cash, amount: 4, direction: .add, reason: "Salary", date: Date())
        XCTAssertEqual(logged.entry?.type, .income)
        XCTAssertEqual(logged.entry?.category, "Income/Deposit")
        XCTAssertEqual(logged.delta, 4)
    }
}

final class SubscriptionTests: XCTestCase {
    func testAdvanceClampsToMonthEnd() {
        XCTAssertEqual(BillingCycle.monthly.advance(day(2026, 1, 31), calendar: utc), day(2026, 2, 28))
        XCTAssertEqual(BillingCycle.weekly.advance(day(2026, 1, 31), calendar: utc), day(2026, 2, 7))
        XCTAssertEqual(BillingCycle.yearly.advance(day(2028, 2, 29), calendar: utc), day(2029, 2, 28))
    }

    func testDueStatus() {
        let now = day(2026, 10, 19, 22)
        XCTAssertEqual(SubscriptionMath.daysUntil(day(2026, 10, 19, 1), now: now, calendar: utc), 0)
        XCTAssertEqual(SubscriptionMath.daysUntil(day(2026, 10, 17), now: now, calendar: utc), -2)
        XCTAssertEqual(DueStatus(daysUntil: -2).label, "Overdue 2d")
        XCTAssertEqual(DueStatus(daysUntil: 3), .soon(days: 3))
        XCTAssertEqual(DueStatus(daysUntil: 7), .thisWeek(days: 7))

        let sub = SubscriptionPlan(name: "iCloud", amount: 1, currency: "USD", wallet: "Cash",
                               category: "Bills & Utilities", nextDate: day(2026, 10, 19, 1))
        XCTAssertTrue(SubscriptionMath.needsAttention(sub, now: now, calendar: utc))
        var paused = sub
        paused.active = false
        XCTAssertFalse(SubscriptionMath.needsAttention(paused, now: now, calendar: utc))
    }

    func testMonthlyEstimate() {
        let subs = [
            SubscriptionPlan(name: "A", amount: 12, currency: "USD", wallet: "Cash", category: "x", cycle: .yearly, nextDate: Date()),
            SubscriptionPlan(name: "B", amount: 41_000, currency: "KHR", wallet: "Riel", category: "x", cycle: .monthly, nextDate: Date()),
            SubscriptionPlan(name: "C", amount: 100, currency: "USD", wallet: "Cash", category: "x", nextDate: Date(), active: false),
        ]
        XCTAssertEqual(SubscriptionMath.monthlyEstimate(subs, in: "USD", rates: .fallback), 11, accuracy: 1e-9)
    }

    func testChargeValidation() {
        let sub = SubscriptionPlan(name: "Gym", amount: 150, currency: "USD", wallet: "Cash", category: "Healthcare", nextDate: Date())
        XCTAssertEqual(SubscriptionMath.validateCharge(sub, wallet: nil), "Wallet \"Cash\" not found.")
        XCTAssertEqual(SubscriptionMath.validateCharge(sub, wallet: cash), "Insufficient balance in \"Cash\".")
        let entry = SubscriptionMath.chargeEntry(for: sub, date: day(2026, 1, 1))
        XCTAssertEqual(entry.note, "Gym")
        XCTAssertEqual(entry.type, .expense)
    }
}

final class PeriodAndAnalyticsTests: XCTestCase {
    let now = day(2026, 10, 19)

    func testPeriods() {
        XCTAssertTrue(Period.thisMonth.contains(day(2026, 10, 1, 0), now: now, calendar: utc))
        XCTAssertFalse(Period.thisMonth.contains(day(2026, 11, 1, 0), now: now, calendar: utc))
        XCTAssertTrue(Period.lastMonth.contains(day(2026, 9, 30, 23), now: now, calendar: utc))
        let custom = Period.custom(start: day(2026, 10, 5), end: day(2026, 10, 3))
        XCTAssertTrue(custom.contains(day(2026, 10, 5, 23), now: now, calendar: utc))
        XCTAssertFalse(custom.contains(day(2026, 10, 6, 0), now: now, calendar: utc))
        XCTAssertEqual(Period.lastMonth.fileLabel(now: now, calendar: utc), "expenses_2026-09")
        XCTAssertEqual(custom.fileLabel(now: now, calendar: utc), "expenses_20261003_20261005")
    }

    func testTotalsAndBreakdown() {
        let entries = [
            Expense(amount: 10, category: "Food & Dining", wallet: "Cash", date: day(2026, 9, 2), currency: "USD"),
            Expense(amount: 41_000, category: "Groceries", wallet: "Riel", date: day(2026, 10, 2), currency: "KHR"),
            Expense(amount: 100, category: "Salary", wallet: "Cash", date: day(2026, 10, 1), currency: "USD", type: .income),
            Expense(amount: 5, category: "Transfer", wallet: "Cash", date: day(2026, 10, 3), currency: "USD", type: .transfer),
        ]
        let t = Stats.totals(entries, in: "USD", rates: .fallback)
        XCTAssertEqual(t.income, 100)
        XCTAssertEqual(t.expenses, 20)
        XCTAssertEqual(t.transfers, 5)
        XCTAssertEqual(t.net, 80)

        let shares = Stats.categoryBreakdown(entries, in: "USD", rates: .fallback)
        XCTAssertEqual(shares.map(\.category.name), ["Food & Dining", "Groceries"])
        XCTAssertEqual(shares.map(\.percent), [50, 50])

        let months = Stats.monthly(entries, in: "USD", rates: .fallback, calendar: utc)
        XCTAssertEqual(months.map(\.label), ["Sep 26", "Oct 26"])
        XCTAssertEqual(months.last?.income, 100)
        XCTAssertEqual(months.last?.expense, 10)

        let activity = Stats.walletActivity(entries, wallets: [cash, riel, Wallet(name: "Idle", balance: 0, currency: "USD")])
        XCTAssertEqual(activity.map(\.name), ["Cash", "Riel"])
        XCTAssertEqual(activity.first?.spent, 10)
        XCTAssertEqual(activity.first?.received, 100)
        XCTAssertEqual(activity.first?.transactionCount, 3)

        XCTAssertTrue(Stats.hasEntry(on: day(2026, 10, 3, 1), in: entries, calendar: utc))
        XCTAssertFalse(Stats.hasEntry(on: day(2026, 10, 4), in: entries, calendar: utc))
    }
}

final class CSVTests: XCTestCase {
    func testParserHandlesQuotesAndLineEndings() {
        let rows = CSV.parse("a,\"b, c\",\"say \"\"hi\"\"\"\r\n\n1,\"multi\nline\",3\n")
        XCTAssertEqual(rows, [["a", "b, c", "say \"hi\""], ["1", "multi\nline", "3"]])
    }

    func testImportGuideExample() throws {
        // The sample from IMPORT_GUIDE.md: M/D/YYYY dates, negative amount = income.
        let text = """
        Date,Category,Description,Wallet,Amount,Currency
        2/25/2026,Salary,Income,Daily,-290,USD
        2/24/2026,Bills & Utilities,Laptop Charger,Daily,16,USD
        2/25/2026,Food & Dining,Fruits,Cash (Dollar),10000,KHR
        2/25/2026,Transportation,Petroleum,Daily,3.99,USD
        """
        let result = try CSVImport.entries(from: text, existing: [], calendar: utc)
        XCTAssertEqual(result.entries.count, 4)
        XCTAssertEqual(result.entries[0].type, .income)
        XCTAssertEqual(result.entries[0].amount, 290)
        XCTAssertEqual(utc.dateComponents([.month, .day], from: result.entries[1].date), DateComponents(month: 2, day: 24))
        XCTAssertEqual(result.entries[3].amount, 3.99)
    }

    func testDuplicatesAndInvalidRowsAreSkipped() throws {
        let existing = [Expense(amount: 16, category: "Bills & Utilities", wallet: "Daily", note: "Charger",
                                date: day(2026, 2, 24, 18), currency: "USD")]
        let text = """
        Date,Category,Description,Wallet,Amount,Currency
        24/02/2026,Bills & Utilities,Charger,Daily,16,USD
        31/02/2026,Food & Dining,Bad date,Daily,1,USD
        25/02/2026,Food & Dining,Bad amount,Daily,abc,USD
        25/02/2026,Food & Dining,Lunch,Daily,4,USD
        """
        let result = try CSVImport.entries(from: text, existing: existing, calendar: utc)
        XCTAssertEqual(result.entries.map(\.note), ["Lunch"])
        XCTAssertEqual(result.duplicates, 1)
        XCTAssertEqual(result.invalid, 2)
    }

    func testMissingColumnsThrows() {
        XCTAssertThrowsError(try CSVImport.entries(from: "Date,Amount\n1/1/2026,3", existing: [])) {
            XCTAssertEqual($0 as? CSVImportError, .missingColumns)
        }
    }

    func testExportRoundTripKeepsTypes() throws {
        let entries = [
            Expense(amount: 3.99, category: "Food & Dining", wallet: "Cash, USD", note: "Coffee \"large\"",
                    date: day(2026, 3, 14), currency: "USD"),
            Expense(amount: 500, category: "Freelance", wallet: "Bank", note: "Logo job",
                    date: day(2026, 3, 15), currency: "USD", type: .income),
        ]
        let csv = CSVExport.expenses(entries, calendar: utc)
        XCTAssertTrue(csv.hasPrefix("Date,Category,Description,Wallet,Amount,Currency,Type\n14/03/2026,"))
        let back = try CSVImport.entries(from: csv, existing: [], calendar: utc)
        XCTAssertEqual(back.entries.map(\.type), [.expense, .income])
        XCTAssertEqual(back.entries.map(\.wallet), ["Cash, USD", "Bank"])
        XCTAssertEqual(back.entries.map(\.note), ["Coffee \"large\"", "Logo job"])
        XCTAssertEqual(back.entries.first?.amount, 3.99)
    }

    func testSubscriptionsExport() {
        let csv = CSVExport.subscriptions([
            SubscriptionPlan(name: "Netflix", amount: 9.99, currency: "USD", wallet: "ABA", category: "Entertainment",
                         nextDate: day(2026, 11, 1)),
        ], calendar: utc)
        XCTAssertEqual(csv, "Name,Amount,Currency,Cycle,NextDate,Wallet,Category,Active\nNetflix,9.99,USD,monthly,01/11/2026,ABA,Entertainment,true")
    }
}
