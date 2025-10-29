"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit } from "lucide-react"
import type { Expense } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { formatCurrency } from "../data/currency-data"
import type { Wallet } from "../types/wallet"

interface ExpenseFormProps {
  expense?: Expense
  wallets: Wallet[] // Add wallets prop
  onSubmit: (expense: Omit<Expense, "id">) => void
  trigger?: React.ReactNode
}

export function ExpenseForm({ expense, wallets, onSubmit, trigger }: ExpenseFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    wallet: "",
    description: "",
  })

  const selectedWallet = wallets.find((w) => w.name === formData.wallet)

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        category: expense.category,
        wallet: expense.wallet,
        description: expense.description,
      })
    }
  }, [expense])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount || !formData.category || !formData.wallet) return

    const wallet = wallets.find((w) => w.name === formData.wallet)
    if (!wallet) return

    onSubmit({
      amount: Number.parseFloat(formData.amount),
      category: formData.category,
      wallet: formData.wallet,
      description: formData.description,
      date: expense?.date || new Date(),
      currency: wallet.currency,
    })

    if (!expense) {
      setFormData({ amount: "", category: "", wallet: "", description: "" })
    }
    setOpen(false)
  }

  const defaultTrigger = expense ? (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <Edit className="h-4 w-4" />
    </Button>
  ) : (
    <Button className="w-full sm:w-auto">
      <Plus className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">Add Expense</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{expense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet" className="text-sm">
              Wallet
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
                  <SelectItem key={wallet.id} value={wallet.name}>
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
              <div className="text-sm text-muted-foreground">
                {formatCurrency(Number.parseFloat(formData.amount), selectedWallet.currency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm">
              Category
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
                {defaultCategories.map((category) => (
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
            <Label htmlFor="description" className="text-sm">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter expense description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {expense ? "Update" : "Add"} Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
