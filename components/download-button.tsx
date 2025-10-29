"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileText, Filter } from "lucide-react"
import type { Expense } from "../types/expense"
import { exportToCSV, exportFilteredToCSV } from "../utils/csv-export"

interface DownloadButtonProps {
  expenses: Expense[]
  filteredExpenses?: Expense[]
  searchTerm?: string
  categoryFilter?: string
  walletFilter?: string
  showFilteredOption?: boolean
}

export function DownloadButton({
  expenses,
  filteredExpenses,
  searchTerm = "",
  categoryFilter = "all",
  walletFilter = "all",
  showFilteredOption = false,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadAll = async () => {
    setIsDownloading(true)
    try {
      exportToCSV(expenses, "all_expenses")
    } catch (error) {
      console.error("Error downloading CSV:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadFiltered = async () => {
    setIsDownloading(true)
    try {
      exportFilteredToCSV(expenses, searchTerm, categoryFilter, walletFilter)
    } catch (error) {
      console.error("Error downloading filtered CSV:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  const hasFilters = searchTerm !== "" || categoryFilter !== "all" || walletFilter !== "all"
  const filteredCount = filteredExpenses?.length || 0

  if (!showFilteredOption || !hasFilters) {
    return (
      <Button onClick={handleDownloadAll} disabled={isDownloading || expenses.length === 0} variant="outline">
        <Download className="h-4 w-4 mr-2" />
        {isDownloading ? "Downloading..." : `Download CSV (${expenses.length})`}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isDownloading}>
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? "Downloading..." : "Download CSV"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadAll}>
          <FileText className="h-4 w-4 mr-2" />
          All Expenses ({expenses.length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadFiltered}>
          <Filter className="h-4 w-4 mr-2" />
          Filtered Results ({filteredCount})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
