"use client"

import { useState, useEffect } from "react"
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button } from "antd"
import { ArrowUpOutlined, LockOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import type { Wallet } from "../types/expense"
import { formatCurrency } from "../data/currency-data"

const incomeCategories = [
  { value: "Salary", label: "💼 Salary" },
  { value: "Freelance", label: "💻 Freelance" },
  { value: "Business", label: "🏢 Business" },
  { value: "Investment", label: "📈 Investment" },
  { value: "Gift", label: "🎁 Gift" },
  { value: "Refund", label: "↩️ Refund" },
  { value: "Other Income", label: "💰 Other Income" },
]

interface IncomeFormProps {
  wallets: Wallet[]
  onSubmit: (walletId: string, amount: number, description: string, category: string, date: Date) => Promise<void> | void
}

export function IncomeForm({ wallets, onSubmit }: IncomeFormProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | undefined>()
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({ date: dayjs() })
      setSelectedWallet(undefined)
    }
  }, [open])

  const doSubmit = async (values: ReturnType<typeof form.getFieldsValue>) => {
    setConfirming(true)
    try {
      await onSubmit(
        values.wallet,
        values.amount,
        values.description || "",
        values.category,
        values.date ? values.date.toDate() : new Date(),
      )
      setOpen(false)
    } catch {
      // validation errors handled by Form
    } finally {
      setConfirming(false)
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const wallet = wallets.find((w) => w.id === values.wallet)
      if (wallet?.locked) {
        Modal.confirm({
          title: <span><LockOutlined className="text-amber-500 mr-2" />Locked wallet</span>,
          content: `"${wallet.name}" is locked. Are you sure you want to add income to this wallet?`,
          okText: "Proceed",
          cancelText: "Cancel",
          onOk: () => doSubmit(values),
        })
        return
      }
      await doSubmit(values)
    } catch {
      // validation errors handled by Form
    }
  }

  const walletOptions = wallets.map((w) => ({
    value: w.id,
    label: `${w.name} — ${formatCurrency(w.balance, w.currency)}`,
  }))

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff", height: 40 }}
        icon={<ArrowUpOutlined />}
      >
        <span className="hidden sm:inline ml-1">Add Income</span>
      </Button>

      <Modal
        title="Add Income"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        okText="Add Income"
        okButtonProps={{ style: { background: "#16a34a", borderColor: "#16a34a" } }}
        confirmLoading={confirming}
        destroyOnHidden
        width="min(90vw, 440px)"
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="wallet" label="Deposit to Wallet" rules={[{ required: true, message: "Select a wallet" }]}>
            <Select
              options={walletOptions}
              placeholder="Select wallet"
              onChange={(id) => setSelectedWallet(wallets.find((w) => w.id === id))}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label={`Amount${selectedWallet ? ` (${selectedWallet.currency})` : ""}`}
            rules={[
              { required: true, message: "Enter an amount" },
              { type: "number", min: 0.01, message: "Must be greater than 0" },
            ]}
          >
            <InputNumber
              className="w-full"
              min={0}
              step={selectedWallet?.currency === "KHR" ? 1 : 0.01}
              placeholder={selectedWallet?.currency === "KHR" ? "0" : "0.00"}
            />
          </Form.Item>

          <Form.Item name="category" label="Income Category" rules={[{ required: true, message: "Select a category" }]}>
            <Select options={incomeCategories} placeholder="Select category" />
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true, message: "Select a date" }]}>
            <DatePicker className="w-full" disabledDate={(d) => d.isAfter(dayjs())} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter income description…" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
