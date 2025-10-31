"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TrendingUp } from "lucide-react"
import type { Wallet } from "../types/expense"
import { formatCurrency } from "../data/currency-data"

interface IncomeFormProps {
  wallets: Wallet[]
  onSubmit: (walletId: string, amount: number, description: string, category: string, date: Date) => void
}

const incomeCategories = [
  { id: "salary", name: "Salary", icon: "💼" },
  { id: "freelance", name: "Freelance", icon: "💻" },
  { id: "business", name: "Business", icon: "🏢" },
  { id: "investment", name: "Investment", icon: "📈" },
  { id: "gift", name: "Gift", icon: "🎁" },
  { id: "refund", name: "Refund", icon: "↩️" },
  { id: "other", name: "Other Income", icon: "💰" },
]

export function IncomeForm({ wallets, onSubmit }: IncomeFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    wallet: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0], // Default to today in YYYY-MM-DD format
  })

  const selectedWallet = wallets.find((w) => w.id === formData.wallet)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount || !formData.wallet || !formData.category) return

    onSubmit(
      formData.wallet,
      Number.parseFloat(formData.amount),
      formData.description,
      formData.category,
      new Date(formData.date),
    )

    setFormData({
      amount: "",
      wallet: "",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0], // Reset to today
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
          <TrendingUp className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Income</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add Income</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet" className="text-sm">
              Deposit to Wallet
            </Label>
            <Select
              value={formData.wallet}
              onValueChange={(value) => setFormData({ ...formData, wallet: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{wallet.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm">
              Amount {selectedWallet && `(${selectedWallet.currency})`}
            </Label>
            <Input
              id="amount"
              type="number"
              step={selectedWallet?.currency === "KHR" ? "1" : "0.01"}
              placeholder={selectedWallet?.currency === "KHR" ? "0" : "0.00"}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            {selectedWallet && formData.amount && (
              <div className="text-sm text-green-600 font-medium">
                + {formatCurrency(Number.parseFloat(formData.amount), selectedWallet.currency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm">
              Income Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="text-sm">{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={new Date().toISOString().split("T")[0]} // Prevent future dates
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter income description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              Add Income
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
