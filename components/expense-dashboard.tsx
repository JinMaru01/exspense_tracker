"use client"

import type React from "react"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Expense } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { DownloadButton } from "./download-button"
import { CurrencyConverter } from "./currency-converter"
import { formatCurrency, convertCurrency } from "../data/currency-data"

interface ExpenseDashboardProps {
  expenses: Expense[]
}

export function ExpenseDashboard({ expenses }: ExpenseDashboardProps) {
  const currencyTotals = useMemo(() => {
    const totals = expenses.reduce(
      (acc, expense) => {
        acc[expense.currency] = (acc[expense.currency] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )
    return totals
  }, [expenses])

  const categoryTotals = useMemo(() => {
    const totals = expenses.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
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
  }, [expenses])

  const totalInUSD = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      return sum + convertCurrency(expense.amount, expense.currency, "USD")
    }, 0)
  }, [expenses])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total (USD Equivalent)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalInUSD, "USD")}</div>
            <p className="text-xs text-muted-foreground">Across all currencies</p>
          </CardContent>
        </Card>

        {Object.entries(currencyTotals).map(([currency, total]) => (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total in {currency}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(total, currency)}</div>
              <p className="text-xs text-muted-foreground">
                ≈{" "}
                {formatCurrency(
                  convertCurrency(total, currency, currency === "USD" ? "KHR" : "USD"),
                  currency === "USD" ? "KHR" : "USD",
                )}
              </p>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end col-span-1 sm:col-span-2 lg:col-span-1">
          <DownloadButton expenses={expenses} />
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
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(category.total, "USD")}</div>
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
