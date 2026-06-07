"use client"

import { useState, useEffect } from "react"
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, Alert } from "antd"
import { LockOutlined } from "@ant-design/icons"
import { PlusOutlined, EditOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import type { Expense, Wallet } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { formatCurrency } from "../data/currency-data"

interface ExpenseFormProps {
  expense?: Expense
  wallets: Wallet[]
  onSubmit: (expense: Omit<Expense, "id">) => Promise<string | null | void> | string | null | void
  trigger?: React.ReactNode
}

export function ExpenseForm({ expense, wallets, onSubmit, trigger }: ExpenseFormProps) {
  const [open, setOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | undefined>()
  const [confirming, setConfirming] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (expense) {
        const wallet = wallets.find((w) => w.name === expense.wallet)
        setSelectedWallet(wallet)
        form.setFieldsValue({
          wallet: expense.wallet,
          amount: expense.amount,
          category: expense.category,
          date: dayjs(expense.date),
          description: expense.description,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ date: dayjs() })
        setSelectedWallet(undefined)
      }
      setSubmitError(null)
    }
  }, [open])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setConfirming(true)
      setSubmitError(null)

      const wallet = wallets.find((w) => w.name === values.wallet)
      if (!wallet) { setConfirming(false); return }

      if (!expense && wallet.balance < values.amount) {
        setSubmitError(`Insufficient balance. Available: ${formatCurrency(wallet.balance, wallet.currency)}`)
        setConfirming(false)
        return
      }

      if (wallet.locked) {
        setConfirming(false)
        Modal.confirm({
          title: <span><LockOutlined className="text-amber-500 mr-2" />Locked wallet</span>,
          content: `"${wallet.name}" is locked. Are you sure you want to proceed with this transaction?`,
          okText: "Proceed",
          cancelText: "Cancel",
          onOk: () => doSubmit(values, wallet),
        })
        return
      }

      await doSubmit(values, wallet)
    } catch {
      // validation errors handled by Form.Item
    } finally {
      setConfirming(false)
    }
  }

  const doSubmit = async (values: ReturnType<typeof form.getFieldsValue>, wallet: (typeof wallets)[0]) => {
    setConfirming(true)
    try {
      const result = await onSubmit({
        amount: values.amount,
        category: values.category,
        wallet: values.wallet,
        description: values.description || "",
        date: values.date ? values.date.toDate() : new Date(),
        currency: wallet.currency,
        type: expense?.type ?? "expense",
      })

      if (typeof result === "string" && result.length > 0) {
        setSubmitError(result)
      } else {
        setOpen(false)
      }
    } catch {
      // validation handled by Form.Item
    } finally {
      setConfirming(false)
    }
  }

  const walletOptions = wallets.map((w) => ({
    value: w.name,
    label: `${w.name} — ${formatCurrency(w.balance, w.currency)}`,
  }))

  const categoryOptions = defaultCategories.map((c) => ({
    value: c.name,
    label: `${c.icon} ${c.name}`,
  }))

  const defaultTrigger = expense ? (
    <Button type="text" size="small" icon={<EditOutlined />} />
  ) : (
    <Button type="primary" icon={<PlusOutlined />} className="h-10">
      <span className="hidden sm:inline ml-1">Add Expense</span>
    </Button>
  )

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger ?? defaultTrigger}
      </span>

      <Modal
        title={expense ? "Edit Expense" : "Add New Expense"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        okText={expense ? "Update" : "Add Expense"}
        confirmLoading={confirming}
        destroyOnHidden
        width="min(90vw, 440px)"
      >
        {submitError && <Alert message={submitError} type="error" showIcon className="mb-4" />}
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item name="wallet" label="Wallet" rules={[{ required: true, message: "Select a wallet" }]}>
            <Select
              options={walletOptions}
              placeholder="Select wallet"
              onChange={(val) => {
                setSelectedWallet(wallets.find((w) => w.name === val))
                setSubmitError(null)
              }}
            />
          </Form.Item>

          {selectedWallet && (
            <p className="text-xs text-gray-400 -mt-3 mb-3">
              Available:{" "}
              <span className="font-medium text-gray-600">
                {formatCurrency(selectedWallet.balance, selectedWallet.currency)}
              </span>
            </p>
          )}

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
              onChange={() => setSubmitError(null)}
            />
          </Form.Item>

          <Form.Item name="category" label="Category" rules={[{ required: true, message: "Select a category" }]}>
            <Select options={categoryOptions} placeholder="Select category" />
          </Form.Item>

          <Form.Item name="date" label="Date" rules={[{ required: true, message: "Select a date" }]}>
            <DatePicker className="w-full" disabledDate={(d) => d.isAfter(dayjs())} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter expense description…" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
