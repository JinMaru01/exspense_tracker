import type { Expense } from "../types/expense"

export interface CSVRow {
  date: string
  category: string
  description: string
  wallet: string
  amount: string
  currency: string
  type?: string
}

const INCOME_CATEGORIES = new Set([
  "salary", "income", "income/deposit", "gift", "refund",
  "freelance", "business", "investment", "other income", "bonus",
])

// Detect whether dates are M/D/YYYY or DD/MM/YYYY by scanning all date strings.
// If any middle segment > 12 → it must be a day → format is M/D/YYYY.
// If any first segment > 12  → it must be a day → format is DD/MM/YYYY.
// Ambiguous: default to DD/MM/YYYY (matches new-app exports).
function detectDateFormat(dates: string[]): "MDY" | "DMY" {
  for (const d of dates) {
    const parts = d.split("/")
    if (parts.length !== 3) continue
    if (parseInt(parts[1]) > 12) return "MDY"
    if (parseInt(parts[0]) > 12) return "DMY"
  }
  return "DMY"
}

function parseDate(dateStr: string, fmt: "MDY" | "DMY"): Date {
  const parts = dateStr.split("/")
  if (parts.length !== 3) return new Date()
  const [p0, p1, p2] = parts.map((p) => parseInt(p, 10))
  if (fmt === "MDY") {
    // M/D/YYYY → month=p0, day=p1
    return new Date(p2, p0 - 1, p1)
  }
  // DD/MM/YYYY → day=p0, month=p1
  return new Date(p2, p1 - 1, p0)
}

export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split("\n")
  if (lines.length < 2) {
    throw new Error("CSV file must contain headers and at least one data row")
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  const dateIdx = headers.findIndex((h) => h === "date")
  const categoryIdx = headers.findIndex((h) => h === "category")
  const descriptionIdx = headers.findIndex((h) => h === "description")
  const walletIdx = headers.findIndex((h) => h === "wallet")
  const amountIdx = headers.findIndex((h) => h === "amount")
  const currencyIdx = headers.findIndex((h) => h === "currency")
  const typeIdx = headers.findIndex((h) => h === "type")

  if (
    dateIdx === -1 || categoryIdx === -1 || descriptionIdx === -1 ||
    walletIdx === -1 || amountIdx === -1 || currencyIdx === -1
  ) {
    throw new Error("CSV must contain columns: Date, Category, Description, Wallet, Amount, Currency")
  }

  const maxIdx = Math.max(dateIdx, categoryIdx, descriptionIdx, walletIdx, amountIdx, currencyIdx)
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const fields = parseCSVLine(line)
    if (fields.length < maxIdx + 1) continue

    rows.push({
      date: fields[dateIdx]?.trim() || "",
      category: fields[categoryIdx]?.trim() || "",
      description: fields[descriptionIdx]?.trim() || "",
      wallet: fields[walletIdx]?.trim() || "",
      amount: fields[amountIdx]?.trim() || "0",
      currency: fields[currencyIdx]?.trim() || "USD",
      type: typeIdx !== -1 ? fields[typeIdx]?.trim() : undefined,
    })
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === "," && !insideQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields
}

export function importCSVExpenses(csvContent: string, existingExpenses: Expense[]): Expense[] {
  const rows = parseCSV(csvContent)
  if (rows.length === 0) return []

  // Auto-detect date format from the whole file
  const fmt = detectDateFormat(rows.map((r) => r.date))

  const newExpenses: Expense[] = rows.map((row) => {
    const amount = Math.abs(parseFloat(row.amount))
    const id = `imported_${Date.now()}_${Math.random()}`
    const cat = row.category.toLowerCase()

    // Explicit type column wins; otherwise infer from category/sign
    let type: "income" | "expense" | "transfer" = "expense"
    if (row.type) {
      const t = row.type.toLowerCase()
      if (t === "income") type = "income"
      else if (t === "transfer") type = "transfer"
    } else if (parseFloat(row.amount) < 0) {
      type = "income"
    } else if (cat.includes("transfer")) {
      type = "transfer"
    } else if (INCOME_CATEGORIES.has(cat)) {
      type = "income"
    }

    return {
      id,
      date: parseDate(row.date, fmt),
      category: row.category,
      description: row.description,
      wallet: row.wallet,
      amount,
      currency: row.currency,
      type,
    }
  })

  // Deduplicate against existing records
  return newExpenses.filter(
    (newExp) =>
      !existingExpenses.some(
        (e) =>
          e.description === newExp.description &&
          e.wallet === newExp.wallet &&
          e.amount === newExp.amount &&
          new Date(e.date).toLocaleDateString() === newExp.date.toLocaleDateString(),
      ),
  )
}
