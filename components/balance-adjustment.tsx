"use client"

import { useState, useEffect } from "react"
import { Modal, Form, InputNumber, Radio, Input, Button } from "antd"
import { DollarOutlined } from "@ant-design/icons"
import type { Wallet } from "../types/expense"
import { formatCurrency } from "../data/currency-data"

interface BalanceAdjustmentProps {
  wallet: Wallet
  onAdjustBalance: (walletId: string, amount: number, type: "add" | "subtract", reason: string) => Promise<void> | void
}

export function BalanceAdjustment({ wallet, onAdjustBalance }: BalanceAdjustmentProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [adjType, setAdjType] = useState<"add" | "subtract">("add")
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({ type: "add" })
      setAdjType("add")
    }
  }, [open])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setConfirming(true)
      await onAdjustBalance(wallet.id, values.amount, values.type, values.reason || "")
      setOpen(false)
    } catch {
      // validation
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      <Button size="small" icon={<DollarOutlined />} onClick={() => setOpen(true)}>
        Adjust
      </Button>

      <Modal
        title={`Adjust Balance — ${wallet.name}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        okText="Confirm"
        okButtonProps={{ danger: adjType === "subtract" }}
        confirmLoading={confirming}
        destroyOnHidden
        width="min(90vw, 420px)"
      >
        <p className="text-gray-500 mb-4">
          Current balance:{" "}
          <span className="font-semibold text-gray-800">{formatCurrency(wallet.balance, wallet.currency)}</span>
        </p>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Adjustment Type">
            <Radio.Group onChange={(e) => setAdjType(e.target.value)}>
              <Radio.Button value="add">Add Money</Radio.Button>
              <Radio.Button value="subtract">Subtract Money</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="amount"
            label={`Amount (${wallet.currency})`}
            rules={[
              { required: true, message: "Enter an amount" },
              { type: "number", min: 0.01, message: "Must be greater than 0" },
            ]}
          >
            <InputNumber
              className="w-full"
              min={0}
              step={wallet.currency === "KHR" ? 1 : 0.01}
              placeholder={wallet.currency === "KHR" ? "0" : "0.00"}
            />
          </Form.Item>

          <Form.Item name="reason" label="Reason (optional)">
            <Input.TextArea placeholder="e.g. Salary deposit, ATM withdrawal" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
