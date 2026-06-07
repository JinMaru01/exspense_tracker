"use client"

import { useState, useEffect } from "react"
import { Card, Form, InputNumber, Select, Button, Alert, Modal } from "antd"
import { SwapOutlined, ReloadOutlined, LockOutlined } from "@ant-design/icons"
import type { Wallet } from "../types/expense"
import { formatCurrency } from "../data/currency-data"
import { convertWithLiveRate } from "../lib/exchange-rate-api"

interface WalletTransferProps {
  wallets: Wallet[]
  onTransfer: (fromWalletId: string, toWalletId: string, amount: number, convertedAmount: number, note: string) => Promise<void> | void
}

export function WalletTransfer({ wallets, onTransfer }: WalletTransferProps) {
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [converted, setConverted] = useState<number | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromWallet = wallets.find((w) => w.id === fromId)
  const toWallet = wallets.find((w) => w.id === toId)

  useEffect(() => {
    if (!amount || !fromWallet || !toWallet || amount <= 0) {
      setConverted(null)
      setRate(null)
      return
    }
    let cancelled = false
    setCalculating(true)
    convertWithLiveRate(amount, fromWallet.currency, toWallet.currency).then(({ convertedAmount, rate: r }) => {
      if (!cancelled) { setConverted(convertedAmount); setRate(r) }
    }).catch(console.error).finally(() => { if (!cancelled) setCalculating(false) })
    return () => { cancelled = true }
  }, [amount, fromId, toId])

  const handleTransfer = async () => {
    if (!fromId || !toId || !amount || converted === null) return
    if (fromId === toId) { setError("Cannot transfer to the same wallet."); return }
    if (amount <= 0) { setError("Amount must be greater than 0."); return }
    if (fromWallet && amount > fromWallet.balance) { setError("Insufficient balance in source wallet."); return }

    if (fromWallet?.locked) {
      Modal.confirm({
        title: <span><LockOutlined className="text-amber-500 mr-2" />Locked wallet</span>,
        content: `"${fromWallet.name}" is locked. Confirm to proceed with this transfer?`,
        okText: "Proceed",
        cancelText: "Cancel",
        onOk: () => doTransfer(),
      })
      return
    }
    await doTransfer()
  }

  const doTransfer = async () => {
    if (!fromId || !toId || !amount || converted === null) return
    setSubmitting(true)
    setError(null)
    try {
      await onTransfer(fromId, toId, amount, converted, note)
      setFromId(""); setToId(""); setAmount(null); setNote(""); setConverted(null); setRate(null)
    } catch {
      setError("Transfer failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const refreshRate = async () => {
    if (!amount || !fromWallet || !toWallet) return
    setCalculating(true)
    try {
      const { convertedAmount, rate: r } = await convertWithLiveRate(amount, fromWallet.currency, toWallet.currency)
      setConverted(convertedAmount); setRate(r)
    } finally { setCalculating(false) }
  }

  return (
    <Card title={<span><SwapOutlined className="mr-2" />Transfer Between Wallets</span>}>
      <div className="space-y-4 max-w-lg">
        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />}
        <Form layout="vertical">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item label="From Wallet">
              <Select
                value={fromId || undefined}
                onChange={setFromId}
                placeholder="Select source wallet"
                options={wallets.map((w) => ({ value: w.id, label: w.name + " — " + formatCurrency(w.balance, w.currency) }))}
              />
              {fromWallet && <p className="text-xs text-gray-400 mt-1">Available: {formatCurrency(fromWallet.balance, fromWallet.currency)}</p>}
            </Form.Item>
            <Form.Item label="To Wallet">
              <Select
                value={toId || undefined}
                onChange={setToId}
                placeholder="Select destination wallet"
                options={wallets.filter((w) => w.id !== fromId).map((w) => ({ value: w.id, label: w.name + " — " + formatCurrency(w.balance, w.currency) }))}
              />
            </Form.Item>
          </div>

          <Form.Item label={"Amount" + (fromWallet ? " (" + fromWallet.currency + ")" : "")}>
            <InputNumber
              className="w-full"
              value={amount}
              onChange={(v) => setAmount(v)}
              min={0}
              step={fromWallet?.currency === "KHR" ? 1 : 0.01}
              placeholder={fromWallet?.currency === "KHR" ? "0" : "0.00"}
            />
          </Form.Item>

          {fromWallet && toWallet && converted !== null && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">You will receive:</span>
                <Button size="small" type="text" icon={<ReloadOutlined spin={calculating} />} onClick={refreshRate} disabled={calculating} />
              </div>
              <p className="text-xl font-bold text-indigo-600">{formatCurrency(converted, toWallet.currency)}</p>
              {rate && fromWallet.currency !== toWallet.currency && (
                <p className="text-xs text-gray-400">Rate: 1 {fromWallet.currency} = {rate.toFixed(4)} {toWallet.currency}</p>
              )}
              {fromWallet.currency === toWallet.currency && (
                <p className="text-xs text-gray-400">Same currency — no conversion needed.</p>
              )}
            </div>
          )}

          <Form.Item label="Note (optional)">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Add a note about this transfer…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Form.Item>

          <Button
            type="primary"
            size="large"
            className="w-full"
            onClick={handleTransfer}
            loading={submitting}
            disabled={!fromId || !toId || !amount || calculating || converted === null}
          >
            {calculating ? "Calculating…" : "Transfer"}
          </Button>
        </Form>
      </div>
    </Card>
  )
}
