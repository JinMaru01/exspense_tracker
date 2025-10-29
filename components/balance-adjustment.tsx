"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Minus, DollarSign } from "lucide-react"
import type { Wallet } from "../types/expense"
import { formatCurrency } from "../data/currency-data"

interface BalanceAdjustmentProps {
  wallet: Wallet
  onAdjustBalance: (walletId: string, amount: number, type: "add" | "subtract", reason: string) => void
}

export function BalanceAdjustment({ wallet, onAdjustBalance }: BalanceAdjustmentProps) {
  const [open, setOpen] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number.parseFloat(amount) <= 0) return

    onAdjustBalance(wallet.id, Number.parseFloat(amount), adjustmentType, reason)
    setAmount("")
    setReason("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-2" />
          Adjust Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Wallet Balance</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Current balance: {formatCurrency(wallet.balance, wallet.currency)}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={(value: "add" | "subtract") => setAdjustmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    Add Money (Deposit/Income)
                  </div>
                </SelectItem>
                <SelectItem value="subtract">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-red-600" />
                    Subtract Money (Withdrawal/Fee)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({wallet.currency})</Label>
            <Input
              id="amount"
              type="number"
              step={wallet.currency === "KHR" ? "1" : "0.01"}
              placeholder={wallet.currency === "KHR" ? "0" : "0.00"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {amount && (
              <div className="text-sm text-muted-foreground">
                {adjustmentType === "add" ? "+" : "-"}
                {formatCurrency(Number.parseFloat(amount), wallet.currency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Salary deposit, ATM withdrawal, Bank fees..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {amount && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Preview:</div>
              <div className="text-sm text-muted-foreground">
                Current: {formatCurrency(wallet.balance, wallet.currency)}
              </div>
              <div className="text-sm">
                New Balance:{" "}
                <span className="font-medium">
                  {formatCurrency(
                    adjustmentType === "add"
                      ? wallet.balance + Number.parseFloat(amount)
                      : wallet.balance - Number.parseFloat(amount),
                    wallet.currency,
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={adjustmentType === "add" ? "default" : "destructive"}>
              {adjustmentType === "add" ? "Add" : "Subtract"}{" "}
              {formatCurrency(Number.parseFloat(amount || "0"), wallet.currency)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
