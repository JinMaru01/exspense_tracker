"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, CheckCircle } from "lucide-react"
import type { Expense } from "../types/expense"
import { importCSVExpenses } from "../utils/csv-import"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImportButtonProps {
  onImport: (expenses: Expense[]) => void
  existingExpenses: Expense[]
}

export function ImportButton({ onImport, existingExpenses }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const csvContent = await file.text()
      const newExpenses = importCSVExpenses(csvContent, existingExpenses)

      if (newExpenses.length === 0) {
        setError("No new expenses to import. All entries may be duplicates.")
      } else {
        onImport(newExpenses)
        setSuccess(`Successfully imported ${newExpenses.length} expense(s)!`)

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import CSV file"
      setError(errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        variant="outline"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isImporting ? "Importing..." : "Import CSV"}
      </Button>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="text-sm border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
