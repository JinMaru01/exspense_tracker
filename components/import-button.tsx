"use client"

import { useRef, useState } from "react"
import { Button, message } from "antd"
import { UploadOutlined } from "@ant-design/icons"
import type { Expense } from "../types/expense"
import { importCSVExpenses } from "../utils/csv-import"

interface ImportButtonProps {
  onImport: (expenses: Expense[]) => Promise<void> | void
  existingExpenses: Expense[]
}

export function ImportButton({ onImport, existingExpenses }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const csv = await file.text()
      const newExpenses = importCSVExpenses(csv, existingExpenses)
      if (newExpenses.length === 0) {
        message.warning("No new records to import — all entries may be duplicates.")
      } else {
        await onImport(newExpenses)
        message.success(`Imported ${newExpenses.length} record(s) successfully.`)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to import CSV.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
      <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} loading={loading} style={{ height: 40 }}>
        <span className="hidden sm:inline">Import CSV</span>
      </Button>
    </>
  )
}
