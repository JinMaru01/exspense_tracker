"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, X } from "lucide-react"
import type { Expense, Wallet } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { ExpenseForm } from "./expense-form"
import { DownloadButton } from "./download-button"
import { formatCurrency } from "../data/currency-data"

interface ExpenseListProps {
  expenses: Expense[]
  wallets: Wallet[]
  onUpdateExpense: (id: string, expense: Omit<Expense, "id">) => void
  onDeleteExpense: (id: string) => void
}

export function ExpenseList({ expenses, wallets, onUpdateExpense, onDeleteExpense }: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [walletFilter, setWalletFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const getMonthDateRange = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: firstDay.toISOString().split("T")[0],
      end: lastDay.toISOString().split("T")[0],
    }
  }

  const getLastMonthDateRange = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      start: firstDay.toISOString().split("T")[0],
      end: lastDay.toISOString().split("T")[0],
    }
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesWallet = walletFilter === "all" || expense.wallet === walletFilter

    let matchesDateRange = true
    if (startDate || endDate) {
      const expenseDate = expense.date
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        matchesDateRange = matchesDateRange && expenseDate >= start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        matchesDateRange = matchesDateRange && expenseDate <= end
      }
    }

    return matchesSearch && matchesCategory && matchesWallet && matchesDateRange
  })

  const getCategoryIcon = (categoryName: string) => {
    const category = defaultCategories.find((cat) => cat.name === categoryName)
    return category?.icon || "💰"
  }

  const getCategoryColor = (categoryName: string) => {
    const category = defaultCategories.find((cat) => cat.name === categoryName)
    return category?.color || "#6b7280"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <CardTitle className="text-lg sm:text-xl">Recent Expenses</CardTitle>
          <DownloadButton
            expenses={expenses}
            filteredExpenses={filteredExpenses}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
            walletFilter={walletFilter}
            showFilteredOption={true}
          />
        </div>
        <div className="flex flex-col gap-3 sm:gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {defaultCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={walletFilter} onValueChange={setWalletFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wallets</SelectItem>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.name}>
                    {wallet.name} ({wallet.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!startDate && !endDate ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStartDate("")
                  setEndDate("")
                }}
              >
                All Time
              </Button>
              <Button
                variant={
                  startDate === getMonthDateRange().start && endDate === getMonthDateRange().end ? "default" : "outline"
                }
                size="sm"
                onClick={() => {
                  const range = getMonthDateRange()
                  setStartDate(range.start)
                  setEndDate(range.end)
                }}
              >
                This Month
              </Button>
              <Button
                variant={
                  startDate === getLastMonthDateRange().start && endDate === getLastMonthDateRange().end
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => {
                  const range = getLastMonthDateRange()
                  setStartDate(range.start)
                  setEndDate(range.end)
                }}
              >
                Last Month
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="w-full sm:w-auto">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="text-xs font-medium text-muted-foreground block mb-1">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate("")
                    setEndDate("")
                  }}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[120px]">Category</TableHead>
                <TableHead className="min-w-[150px]">Description</TableHead>
                <TableHead className="min-w-[100px]">Wallet</TableHead>
                <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                <TableHead className="text-right min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-xs sm:text-sm">{expense.date.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-xs whitespace-nowrap"
                        style={{
                          backgroundColor: `${getCategoryColor(expense.category)}20`,
                          color: getCategoryColor(expense.category),
                          border: `1px solid ${getCategoryColor(expense.category)}40`,
                        }}
                      >
                        {getCategoryIcon(expense.category)} {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs sm:text-sm">
                      {expense.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {expense.wallet} ({expense.currency})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs sm:text-sm">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <ExpenseForm
                          expense={expense}
                          wallets={wallets}
                          onSubmit={(updatedExpense) => onUpdateExpense(expense.id, updatedExpense)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteExpense(expense.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
