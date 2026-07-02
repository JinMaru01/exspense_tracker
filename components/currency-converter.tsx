"use client"

import { useState } from "react"
import { Card, InputNumber, Select, Button } from "antd"
import { SwapOutlined } from "@ant-design/icons"
import { currencies, convertCurrency, formatCurrency } from "../data/currency-data"
import { useExchangeRates } from "../hooks/use-exchange-rates"

export function CurrencyConverter() {
  const [amount, setAmount] = useState<number | null>(null)
  const [from, setFrom] = useState("USD")
  const [to, setTo] = useState("KHR")
  useExchangeRates() // refresh with live rates once loaded

  const result = amount ? convertCurrency(amount, from, to) : null
  const options = currencies.map((c) => ({ value: c.code, label: c.symbol + " " + c.code + " - " + c.name }))

  return (
    <div className="space-y-4 max-w-md mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Amount</label>
          <InputNumber className="w-full" min={0} step={0.01} placeholder="0.00" value={amount} onChange={(v) => setAmount(v)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">From</label>
          <Select className="w-full" value={from} onChange={setFrom} options={options} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">To</label>
          <Select className="w-full" value={to} onChange={setTo} options={options} />
        </div>
      </div>
      <Button type="text" size="small" icon={<SwapOutlined />} onClick={() => { setFrom(to); setTo(from) }}>Swap currencies</Button>
      {result !== null && (
        <div className="p-4 bg-indigo-50 rounded-xl text-center">
          <p className="text-gray-500 text-sm">{formatCurrency(amount!, from)}</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(result, to)}</p>
          <p className="text-xs text-gray-400 mt-1">1 {from} = {convertCurrency(1, from, to).toLocaleString()} {to}</p>
        </div>
      )}
    </div>
  )
}
