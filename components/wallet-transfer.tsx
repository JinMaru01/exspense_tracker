"use client"

import { useState, useEffect } from "react"
import { Card, Row, Col, Form, Input, InputNumber, Select, Button, Alert, Modal } from "antd"
import { SwapOutlined, ReloadOutlined, LockOutlined, ArrowDownOutlined } from "@ant-design/icons"
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

  const walletOptions = (list: Wallet[]) =>
    list.map((w) => ({ value: w.id, label: w.name + " — " + formatCurrency(w.balance, w.currency) }))

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title={<span><SwapOutlined className="mr-2" />Transfer Between Wallets</span>} className="h-full">
          {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} className="mb-4" />}
          <Form layout="vertical">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Form.Item label="From Wallet" extra={fromWallet && "Available: " + formatCurrency(fromWallet.balance, fromWallet.currency)}>
                <Select value={fromId || undefined} onChange={setFromId} placeholder="Select source wallet" options={walletOptions(wallets)} />
              </Form.Item>
              <Form.Item label="To Wallet">
                <Select value={toId || undefined} onChange={setToId} placeholder="Select destination wallet" options={walletOptions(wallets.filter((w) => w.id !== fromId))} />
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

            <Form.Item label="Note (optional)">
              <Input placeholder="Add a note about this transfer…" value={note} onChange={(e) => setNote(e.target.value)} />
            </Form.Item>

            <Button
              type="primary"
              size="large"
              block
              icon={<SwapOutlined />}
              onClick={handleTransfer}
              loading={submitting}
              disabled={!fromId || !toId || !amount || calculating || converted === null}
            >
              {calculating ? "Calculating…" : "Transfer"}
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        <Card
          title="Preview"
          className="h-full"
          extra={converted !== null && <Button size="small" type="text" icon={<ReloadOutlined spin={calculating} />} onClick={refreshRate} disabled={calculating} />}
        >
          <div className="space-y-3">
            {[{ label: "From", w: fromWallet }, { label: "To", w: toWallet }].map(({ label, w }, i) => (
              <div key={label}>
                {i === 1 && <div className="flex justify-center pb-3 text-lotus-400"><ArrowDownOutlined /></div>}
                <div className="rounded-2xl bg-warmth-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-warmth-500">{label}</p>
                  <p className="font-medium text-warmth-950">{w ? w.name : "—"}</p>
                  {w && <p className="text-xs text-warmth-500">Balance: {formatCurrency(w.balance, w.currency)}</p>}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-lotus-100 bg-gradient-to-br from-lotus-50 via-warmth-50 to-amber-50 p-4 text-center">
              <p className="text-xs text-warmth-500">You will receive</p>
              <p className="text-2xl font-bold text-lotus-700">
                {toWallet && converted !== null ? formatCurrency(converted, toWallet.currency) : "—"}
              </p>
              {fromWallet && toWallet && converted !== null && (
                <p className="mt-1 text-xs text-warmth-500">
                  {fromWallet.currency === toWallet.currency
                    ? "Same currency — no conversion needed."
                    : rate && `Rate: 1 ${fromWallet.currency} = ${rate.toFixed(4)} ${toWallet.currency}`}
                </p>
              )}
              {converted === null && <p className="mt-1 text-xs text-warmth-500">Choose two wallets and an amount.</p>}
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  )
}
