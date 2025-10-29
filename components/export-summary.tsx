"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar } from "lucide-react"
import type { Expense } from "../types/expense"

interface ExportSummaryProps {
  expenses: Expense[]
}

export function ExportSummary({ expenses }: ExportSummaryProps) {
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const dateRange =
    expenses.length > 0
      ? {
          earliest: new Date(Math.min(...expenses.map((e) => e.date.getTime()))),
          latest: new Date(Math.max(...expenses.map((e) => e.date.getTime()))),
        }
      : null

  const uniqueCategories = new Set(expenses.map((e) => e.category)).size
  const uniqueWallets = new Set(expenses.map((e) => e.wallet)).size

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{expenses.length}</div>
            <div className="text-sm text-muted-foreground">Total Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{uniqueCategories}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{uniqueWallets}</div>
            <div className="text-sm text-muted-foreground">Wallets</div>
          </div>
        </div>

        {dateRange && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {dateRange.earliest.toLocaleDateString()} - {dateRange.latest.toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="secondary">CSV Format</Badge>
          <Badge variant="secondary">UTF-8 Encoded</Badge>
          <Badge variant="secondary">Excel Compatible</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
