import type { Expense } from "../types/expense"

export function exportToCSV(expenses: Expense[], filename = "expenses") {
  // Define CSV headers
  const headers = ["Date", "Category", "Description", "Wallet", "Amount", "Currency"]

  // Convert expenses to CSV rows
  const csvRows = expenses.map((expense) => [
    expense.date.toLocaleDateString(),
    expense.category,
    `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes in description
    expense.wallet,
    expense.amount.toString(),
    expense.currency,
  ])

  // Combine headers and rows
  const csvContent = [headers, ...csvRows].map((row) => row.join(",")).join("\n")

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function exportFilteredToCSV(
  expenses: Expense[],
  searchTerm: string,
  categoryFilter: string,
  walletFilter: string,
) {
  // Apply the same filtering logic as in ExpenseList
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesWallet = walletFilter === "all" || expense.wallet === walletFilter

    return matchesSearch && matchesCategory && matchesWallet
  })

  let filename = "expenses"
  if (categoryFilter !== "all") {
    filename += `_${categoryFilter.toLowerCase().replace(/\s+/g, "_")}`
  }
  if (walletFilter !== "all") {
    filename += `_${walletFilter.toLowerCase().replace(/\s+/g, "_")}`
  }
  if (searchTerm) {
    filename += "_filtered"
  }

  exportToCSV(filteredExpenses, filename)
}
