"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeftRight, RefreshCw } from "lucide-react"
import type { Wallet } from "../types/expense"
import { formatCurrency } from "../data/currency-data"
import { convertWithLiveRate } from "../lib/exchange-rate-api"

interface WalletTransferProps {
  wallets: Wallet[]
  onTransfer: (fromWalletId: string, toWalletId: string, amount: number, convertedAmount: number, note: string) => void
}

export function WalletTransfer({ wallets, onTransfer }: WalletTransferProps) {
  const [fromWalletId, setFromWalletId] = useState("")
  const [toWalletId, setToWalletId] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fromWallet = wallets.find((w) => w.id === fromWalletId)
  const toWallet = wallets.find((w) => w.id === toWalletId)

  // Calculate conversion when amount or wallets change
  useEffect(() => {
    const calculateConversion = async () => {
      if (!amount || !fromWallet || !toWallet || Number.parseFloat(amount) <= 0) {
        setConvertedAmount(null)
        setExchangeRate(null)
        return
      }

      setIsCalculating(true)
      try {
        const { convertedAmount: converted, rate } = await convertWithLiveRate(
          Number.parseFloat(amount),
          fromWallet.currency,
          toWallet.currency,
        )
        setConvertedAmount(converted)
        setExchangeRate(rate)
        setLastUpdated(new Date())
      } catch (error) {
        console.error("[v0] Error calculating conversion:", error)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateConversion()
  }, [amount, fromWallet, toWallet])

  const handleTransfer = () => {
    if (!fromWalletId || !toWalletId || !amount || !convertedAmount) return
    if (fromWalletId === toWalletId) {
      alert("Cannot transfer to the same wallet")
      return
    }

    const transferAmount = Number.parseFloat(amount)
    if (transferAmount <= 0) {
      alert("Amount must be greater than 0")
      return
    }

    if (fromWallet && transferAmount > fromWallet.balance) {
      alert("Insufficient balance in source wallet")
      return
    }

    onTransfer(fromWalletId, toWalletId, transferAmount, convertedAmount, note)

    // Reset form
    setAmount("")
    setNote("")
    setConvertedAmount(null)
    setExchangeRate(null)
  }

  const refreshRate = async () => {
    if (!amount || !fromWallet || !toWallet) return

    setIsCalculating(true)
    try {
      const { convertedAmount: converted, rate } = await convertWithLiveRate(
        Number.parseFloat(amount),
        fromWallet.currency,
        toWallet.currency,
      )
      setConvertedAmount(converted)
      setExchangeRate(rate)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("[v0] Error refreshing rate:", error)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Transfer Between Wallets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from-wallet">From Wallet</Label>
            <Select value={fromWalletId} onValueChange={setFromWalletId}>
              <SelectTrigger id="from-wallet">
                <SelectValue placeholder="Select source wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex flex-col">
                      <span>{wallet.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromWallet && (
              <p className="text-sm text-muted-foreground">
                Available: {formatCurrency(fromWallet.balance, fromWallet.currency)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-wallet">To Wallet</Label>
            <Select value={toWalletId} onValueChange={setToWalletId}>
              <SelectTrigger id="to-wallet">
                <SelectValue placeholder="Select destination wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets
                  .filter((w) => w.id !== fromWalletId)
                  .map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      <div className="flex flex-col">
                        <span>{wallet.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(wallet.balance, wallet.currency)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {toWallet && (
              <p className="text-sm text-muted-foreground">
                Current: {formatCurrency(toWallet.balance, toWallet.currency)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount {fromWallet && `(${fromWallet.currency})`}</Label>
          <Input
            id="amount"
            type="number"
            step={fromWallet?.currency === "KHR" ? "1" : "0.01"}
            placeholder={fromWallet?.currency === "KHR" ? "0" : "0.00"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {amount && fromWallet && (
            <p className="text-sm font-medium">{formatCurrency(Number.parseFloat(amount), fromWallet.currency)}</p>
          )}
        </div>

        {fromWallet && toWallet && fromWallet.currency !== toWallet.currency && convertedAmount !== null && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Converted Amount:</span>
              <Button variant="ghost" size="sm" onClick={refreshRate} disabled={isCalculating} className="h-6 px-2">
                <RefreshCw className={`h-3 w-3 ${isCalculating ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="text-lg font-bold text-primary">{formatCurrency(convertedAmount, toWallet.currency)}</div>
            {exchangeRate && (
              <div className="text-xs text-muted-foreground">
                Rate: 1 {fromWallet.currency} = {exchangeRate.toFixed(4)} {toWallet.currency}
              </div>
            )}
            {lastUpdated && (
              <div className="text-xs text-muted-foreground">Updated: {lastUpdated.toLocaleTimeString()}</div>
            )}
          </div>
        )}

        {fromWallet && toWallet && fromWallet.currency === toWallet.currency && amount && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Same currency - no conversion needed</div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(Number.parseFloat(amount), toWallet.currency)}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="note">Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="Add a note about this transfer..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <Button
          onClick={handleTransfer}
          disabled={!fromWalletId || !toWalletId || !amount || isCalculating}
          className="w-full"
        >
          {isCalculating ? "Calculating..." : "Transfer"}
        </Button>
      </CardContent>
    </Card>
  )
}
