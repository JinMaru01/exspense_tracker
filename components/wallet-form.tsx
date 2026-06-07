"use client"

import { useState, useEffect } from "react"
import { Modal, Form, Input, InputNumber, Select, Button } from "antd"
import { PlusOutlined, EditOutlined } from "@ant-design/icons"
import type { Wallet as WalletType } from "../types/expense"
import { currencies, formatCurrency } from "../data/currency-data"

const walletTypes = [
  { value: "cash", label: "💵 Cash" },
  { value: "bank", label: "🏦 Bank Account" },
  { value: "credit", label: "💳 Credit Card" },
  { value: "savings", label: "🏦 Savings Account" },
  { value: "digital", label: "📱 Digital Wallet" },
  { value: "investment", label: "📈 Investment" },
  { value: "other", label: "💼 Other" },
]

interface WalletFormProps {
  wallet?: WalletType
  onSubmit: (wallet: Omit<WalletType, "id">) => Promise<void> | void
}

export function WalletForm({ wallet, onSubmit }: WalletFormProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState("USD")
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (wallet) {
        setSelectedCurrency(wallet.currency)
        form.setFieldsValue({
          name: wallet.name,
          type: wallet.type || "cash",
          currency: wallet.currency,
          balance: wallet.balance,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ type: "cash", currency: "USD" })
        setSelectedCurrency("USD")
      }
    }
  }, [open])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setConfirming(true)
      const cur = currencies.find((c) => c.code === values.currency)
      await onSubmit({
        name: values.name,
        balance: values.balance,
        currency: values.currency,
        type: values.type,
        exchangeRate: cur?.exchangeRate ?? 1,
      })
      setOpen(false)
    } catch {
      // validation
    } finally {
      setConfirming(false)
    }
  }

  const currencyOptions = currencies.map((c) => ({
    value: c.code,
    label: `${c.symbol} ${c.code} — ${c.name}`,
  }))

  return (
    <>
      <Button
        type={wallet ? "text" : "primary"}
        size={wallet ? "small" : "middle"}
        icon={wallet ? <EditOutlined /> : <PlusOutlined />}
        onClick={() => setOpen(true)}
        style={wallet ? {} : { height: 40 }}
      >
        {!wallet && "Add Wallet"}
      </Button>

      <Modal
        title={wallet ? "Edit Wallet" : "Create New Wallet"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        okText={wallet ? "Update" : "Create Wallet"}
        confirmLoading={confirming}
        destroyOnHidden
        width="min(90vw, 440px)"
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="name" label="Wallet Name" rules={[{ required: true, message: "Enter a name" }]}>
            <Input placeholder="e.g. ABA Bank, Cash" />
          </Form.Item>

          <Form.Item name="type" label="Wallet Type" rules={[{ required: true }]}>
            <Select options={walletTypes} />
          </Form.Item>

          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
            <Select
              options={currencyOptions}
              onChange={(val) => setSelectedCurrency(val)}
            />
          </Form.Item>

          <Form.Item name="balance" label="Initial Balance" rules={[{ required: true, message: "Enter balance" }]}>
            <InputNumber
              className="w-full"
              min={0}
              step={selectedCurrency === "KHR" ? 1 : 0.01}
              placeholder={selectedCurrency === "KHR" ? "0" : "0.00"}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
