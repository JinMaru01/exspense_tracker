"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRightLeft } from "lucide-react"
import { currencies, convertCurrency, formatCurrency } from "../data/currency-data"

export function CurrencyConverter() {
  const [amount, setAmount] = useState("")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("KHR")

  const convertedAmount = amount ? convertCurrency(Number.parseFloat(amount), fromCurrency, toCurrency) : 0

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Currency Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {amount && (
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-lg">
              <span className="font-medium">{formatCurrency(Number.parseFloat(amount), fromCurrency)}</span>
              <span className="mx-2">=</span>
              <span className="font-bold text-primary">{formatCurrency(convertedAmount, toCurrency)}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Exchange rate: 1 {fromCurrency} = {convertCurrency(1, fromCurrency, toCurrency).toLocaleString()}{" "}
              {toCurrency}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
