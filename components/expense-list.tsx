"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Trash2 } from "lucide-react"
import type { Expense } from "../types/expense"
import { mockCategories } from "../data/mock-data"
import { ExpenseForm } from "./expense-form"
import { DownloadButton } from "./download-button"
import { formatCurrency } from "../data/currency-data"
import type { Wallet } from "../types/wallet"

interface ExpenseListProps {
  expenses: Expense[]
  wallets: Wallet[] // Add wallets prop
  onUpdateExpense: (id: string, expense: Omit<Expense, "id">) => void
  onDeleteExpense: (id: string) => void
}

export function ExpenseList({ expenses, wallets, onUpdateExpense, onDeleteExpense }: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [walletFilter, setWalletFilter] = useState("all")

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesWallet = walletFilter === "all" || expense.wallet === walletFilter

    return matchesSearch && matchesCategory && matchesWallet
  })

  const getCategoryIcon = (categoryName: string) => {
    const category = mockCategories.find((cat) => cat.name === categoryName)
    return category?.icon || "💰"
  }

  const getCategoryColor = (categoryName: string) => {
    const category = mockCategories.find((cat) => cat.name === categoryName)
    return category?.color || "#6b7280"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Recent Expenses</CardTitle>
          <DownloadButton
            expenses={expenses}
            filteredExpenses={filteredExpenses}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
            walletFilter={walletFilter}
            showFilteredOption={true}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {mockCategories.map((category) => (
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
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="Savings Account">Savings Account</SelectItem>
              <SelectItem value="Checking Account">Checking Account</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${getCategoryColor(expense.category)}20`,
                          color: getCategoryColor(expense.category),
                          border: `1px solid ${getCategoryColor(expense.category)}40`,
                        }}
                      >
                        {getCategoryIcon(expense.category)} {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description || "No description"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {expense.wallet} ({expense.currency})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ExpenseForm
                          expense={expense}
                          wallets={wallets}
                          onSubmit={(updatedExpense) => onUpdateExpense(expense.id, updatedExpense)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteExpense(expense.id)}
                          className="text-destructive hover:text-destructive"
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
