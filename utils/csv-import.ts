import type { Expense } from "../types/expense"

export interface CSVRow {
  date: string
  category: string
  description: string
  wallet: string
  amount: string
  currency: string
}

export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split("\n")
  if (lines.length < 2) {
    throw new Error("CSV file must contain headers and at least one data row")
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  // Find column indices
  const dateIdx = headers.findIndex((h) => h === "date")
  const categoryIdx = headers.findIndex((h) => h === "category")
  const descriptionIdx = headers.findIndex((h) => h === "description")
  const walletIdx = headers.findIndex((h) => h === "wallet")
  const amountIdx = headers.findIndex((h) => h === "amount")
  const currencyIdx = headers.findIndex((h) => h === "currency")

  if (
    dateIdx === -1 ||
    categoryIdx === -1 ||
    descriptionIdx === -1 ||
    walletIdx === -1 ||
    amountIdx === -1 ||
    currencyIdx === -1
  ) {
    throw new Error("CSV must contain columns: Date, Category, Description, Wallet, Amount, Currency")
  }

  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing (handles quoted fields)
    const fields = parseCSVLine(line)

    if (fields.length < Math.max(dateIdx, categoryIdx, descriptionIdx, walletIdx, amountIdx, currencyIdx) + 1) {
      continue
    }

    rows.push({
      date: fields[dateIdx]?.trim() || "",
      category: fields[categoryIdx]?.trim() || "",
      description: fields[descriptionIdx]?.trim() || "",
      wallet: fields[walletIdx]?.trim() || "",
      amount: fields[amountIdx]?.trim() || "0",
      currency: fields[currencyIdx]?.trim() || "USD",
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
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
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

export function convertCSVRowToExpense(row: CSVRow, existingExpenses: Expense[]): Expense {
  const amount = parseFloat(row.amount)
  const id = `imported_${Date.now()}_${Math.random()}`

  // Determine type based on amount and category
  let type: "income" | "expense" | "transfer" = "expense"
  let finalAmount = Math.abs(amount)

  // If amount is negative, it's income
  if (amount < 0) {
    type = "income"
    finalAmount = Math.abs(amount)
  } else if (row.category.toLowerCase().includes("transfer") || row.description.toLowerCase().includes("transfer")) {
    type = "transfer"
  }

  // Parse date
  const dateStr = row.date
  const dateParts = dateStr.split("/")
  const parsedDate = new Date(Number.parseInt(dateParts[2]), Number.parseInt(dateParts[0]) - 1, Number.parseInt(dateParts[1]))

  return {
    id,
    date: parsedDate,
    category: row.category,
    description: row.description,
    wallet: row.wallet,
    amount: finalAmount,
    currency: row.currency,
    type,
  }
}

export function importCSVExpenses(csvContent: string, existingExpenses: Expense[]): Expense[] {
  const rows = parseCSV(csvContent)
  const newExpenses = rows.map((row) => convertCSVRowToExpense(row, existingExpenses))

  // Avoid duplicates by checking if expense with same description, wallet, amount, and date already exists
  const uniqueExpenses = newExpenses.filter((newExp) => {
    const isDuplicate = existingExpenses.some(
      (existing) =>
        existing.description === newExp.description &&
        existing.wallet === newExp.wallet &&
        existing.amount === newExp.amount &&
        existing.date.toLocaleDateString() === newExp.date.toLocaleDateString(),
    )
    return !isDuplicate
  })

  return uniqueExpenses
}
