"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Expense } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { DownloadButton } from "./download-button"
import { CurrencyConverter } from "./currency-converter"
import { formatCurrency, convertCurrency } from "../data/currency-data"

interface ExpenseDashboardProps {
  expenses: Expense[]
}

export function ExpenseDashboard({ expenses }: ExpenseDashboardProps) {
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "KHR">("USD")
  const [filterType, setFilterType] = useState<"all" | "thisMonth" | "lastMonth" | "custom">("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const filteredExpenses = useMemo(() => {
    const today = new Date()
    let start = new Date(0)
    let end = new Date()

    if (filterType === "thisMonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    } else if (filterType === "lastMonth") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
    } else if (filterType === "custom" && startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
    }

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= start && expenseDate <= end
    })
  }, [expenses, filterType, startDate, endDate])

  const currencyTotals = useMemo(() => {
    const totals = filteredExpenses.reduce(
      (acc, expense) => {
        acc[expense.currency] = (acc[expense.currency] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )
    return totals
  }, [filteredExpenses])

  // Separate expenses and income
  const onlyExpenses = useMemo(() => {
    return filteredExpenses.filter((exp) => exp.type === "expense" || !exp.type)
  }, [filteredExpenses])

  const onlyIncome = useMemo(() => {
    return filteredExpenses.filter((exp) => exp.type === "income")
  }, [filteredExpenses])

  const onlyTransfers = useMemo(() => {
    return filteredExpenses.filter((exp) => exp.type === "transfer")
  }, [filteredExpenses])

  const categoryTotals = useMemo(() => {
    const totals = onlyExpenses.reduce(
      (acc, expense) => {
        // Convert each expense to the selected display currency
        const amountInDisplayCurrency = convertCurrency(expense.amount, expense.currency, displayCurrency)
        acc[expense.category] = (acc[expense.category] || 0) + amountInDisplayCurrency
        return acc
      },
      {} as Record<string, number>,
    )

    const totalExpenses = Object.values(totals).reduce((sum, amount) => sum + amount, 0)

    return defaultCategories
      .map((category) => ({
        ...category,
        total: totals[category.name] || 0,
        percentage: totalExpenses > 0 ? ((totals[category.name] || 0) / totalExpenses) * 100 : 0,
      }))
      .filter((category) => category.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [onlyExpenses, displayCurrency])

  const totalExpensesInDisplayCurrency = useMemo(() => {
    return onlyExpenses.reduce((sum, expense) => {
      return sum + convertCurrency(expense.amount, expense.currency, displayCurrency)
    }, 0)
  }, [onlyExpenses, displayCurrency])

  const totalIncomeInDisplayCurrency = useMemo(() => {
    return onlyIncome.reduce((sum, income) => {
      return sum + convertCurrency(income.amount, income.currency, displayCurrency)
    }, 0)
  }, [onlyIncome, displayCurrency])

  const totalTransfersInDisplayCurrency = useMemo(() => {
    return onlyTransfers.reduce((sum, transfer) => {
      return sum + convertCurrency(transfer.amount, transfer.currency, displayCurrency)
    }, 0)
  }, [onlyTransfers, displayCurrency])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-semibold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">Display in:</span>
          <Select value={displayCurrency} onValueChange={(value) => setDisplayCurrency(value as "USD" | "KHR")}>
            <SelectTrigger className="w-[100px] sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="KHR">KHR (៛)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:p-4 bg-card border rounded-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {filterType === "custom" && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:flex-1">
              <div className="flex-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {filterType !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterType("all")
                setStartDate("")
                setEndDate("")
              }}
              className="text-xs sm:text-sm"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-900">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-700">
              {formatCurrency(totalIncomeInDisplayCurrency, displayCurrency)}
            </div>
            <p className="text-xs text-green-600">
              ≈{" "}
              {formatCurrency(
                convertCurrency(totalIncomeInDisplayCurrency, displayCurrency, displayCurrency === "USD" ? "KHR" : "USD"),
                displayCurrency === "USD" ? "KHR" : "USD",
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-900">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-700">
              {formatCurrency(totalExpensesInDisplayCurrency, displayCurrency)}
            </div>
            <p className="text-xs text-red-600">
              ≈{" "}
              {formatCurrency(
                convertCurrency(totalExpensesInDisplayCurrency, displayCurrency, displayCurrency === "USD" ? "KHR" : "USD"),
                displayCurrency === "USD" ? "KHR" : "USD",
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-700">
              {formatCurrency(totalTransfersInDisplayCurrency, displayCurrency)}
            </div>
            <p className="text-xs text-blue-600">
              ≈{" "}
              {formatCurrency(
                convertCurrency(totalTransfersInDisplayCurrency, displayCurrency, displayCurrency === "USD" ? "KHR" : "USD"),
                displayCurrency === "USD" ? "KHR" : "USD",
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${(totalIncomeInDisplayCurrency - totalExpensesInDisplayCurrency) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(totalIncomeInDisplayCurrency - totalExpensesInDisplayCurrency, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income - Expenses
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end col-span-1 sm:col-span-2 lg:col-span-1">
          <DownloadButton expenses={filteredExpenses} />
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="categories" className="flex-1 sm:flex-none text-xs sm:text-sm">
            By Categories
          </TabsTrigger>
          <TabsTrigger value="converter" className="flex-1 sm:flex-none text-xs sm:text-sm">
            Currency Converter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {categoryTotals.map((category) => (
              <Card key={category.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg">{category.icon}</span>
                      <span className="truncate">{category.name}</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(category.total, displayCurrency)}</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">{category.percentage.toFixed(1)}% of total</span>
                    </div>
                    <Progress
                      value={category.percentage}
                      className="h-2"
                      style={
                        {
                          "--progress-background": category.color,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="converter">
          <CurrencyConverter />
        </TabsContent>
      </Tabs>
    </div>
  )
}
