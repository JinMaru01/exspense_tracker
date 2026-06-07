"use client"

import { useState } from "react"
import { Button, Dropdown } from "antd"
import { DownloadOutlined, FileTextOutlined, FilterOutlined } from "@ant-design/icons"
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
  expenses, filteredExpenses, searchTerm = "", categoryFilter = "all",
  walletFilter = "all", showFilteredOption = false,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const hasFilters = searchTerm !== "" || categoryFilter !== "all" || walletFilter !== "all"

  const downloadAll = () => { setLoading(true); exportToCSV(expenses, "all_expenses"); setLoading(false) }
  const downloadFiltered = () => { setLoading(true); exportFilteredToCSV(expenses, searchTerm, categoryFilter, walletFilter); setLoading(false) }

  if (!showFilteredOption || !hasFilters) {
    return (
      <Button icon={<DownloadOutlined />} onClick={downloadAll} loading={loading} disabled={expenses.length === 0} size="small">
        CSV ({expenses.length})
      </Button>
    )
  }

  return (
    <Dropdown menu={{
      items: [
        { key: "all", label: "All records (" + expenses.length + ")", icon: <FileTextOutlined />, onClick: downloadAll },
        { key: "filtered", label: "Filtered (" + (filteredExpenses?.length ?? 0) + ")", icon: <FilterOutlined />, onClick: downloadFiltered },
      ],
    }} placement="bottomRight">
      <Button icon={<DownloadOutlined />} loading={loading} size="small">CSV</Button>
    </Dropdown>
  )
}
