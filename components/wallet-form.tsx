"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit } from "lucide-react"
import type { WalletType } from "../types/expense"
import { currencies, formatCurrency } from "../data/currency-data"

const walletTypes = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "bank", label: "Bank Account", icon: "🏦" },
  { value: "credit", label: "Credit Card", icon: "💳" },
  { value: "savings", label: "Savings Account", icon: "🏦" },
  { value: "digital", label: "Digital Wallet", icon: "📱" },
  { value: "investment", label: "Investment", icon: "📈" },
  { value: "other", label: "Other", icon: "💼" },
]

interface WalletFormProps {
  wallet?: WalletType
  onSubmit: (wallet: Omit<WalletType, "id">) => void
  trigger?: React.ReactNode
}

export function WalletForm({ wallet, onSubmit, trigger }: WalletFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    currency: "USD",
    type: "cash", // Added type to form data
  })

  useEffect(() => {
    if (wallet) {
      setFormData({
        name: wallet.name,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        type: wallet.type || "cash", // Include type in form data
      })
    }
  }, [wallet])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.balance || !formData.currency || !formData.type) return

    const selectedCurrency = currencies.find((c) => c.code === formData.currency)
    if (!selectedCurrency) return

    onSubmit({
      name: formData.name,
      balance: Number.parseFloat(formData.balance),
      currency: formData.currency,
      type: formData.type, // Include type in submission
      exchangeRate: selectedCurrency.exchangeRate,
    })

    if (!wallet) {
      setFormData({ name: "", balance: "", currency: "USD", type: "cash" })
    }
    setOpen(false)
  }

  const defaultTrigger = wallet ? (
    <Button variant="ghost" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Wallet
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{wallet ? "Edit Wallet" : "Create New Wallet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Wallet Name</Label>
            <Input
              id="name"
              placeholder="e.g., Cash, ABA Bank, Credit Card"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Wallet Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
              <SelectTrigger>
                <SelectValue placeholder="Select wallet type" />
              </SelectTrigger>
              <SelectContent>
                {walletTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span>{currency.symbol}</span>
                      <span>{currency.code}</span>
                      <span className="text-muted-foreground">- {currency.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Initial Balance</Label>
            <Input
              id="balance"
              type="number"
              step={formData.currency === "KHR" ? "1" : "0.01"}
              placeholder={formData.currency === "KHR" ? "0" : "0.00"}
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              required
            />
            {formData.balance && (
              <div className="text-sm text-muted-foreground">
                {formatCurrency(Number.parseFloat(formData.balance), formData.currency)}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{wallet ? "Update" : "Create"} Wallet</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
