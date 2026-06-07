"use client"

import { useState, useEffect } from "react"
import { Card, Table, Tag, Button, Switch, Popconfirm, Modal, Form, Input, InputNumber, Select, DatePicker, Space, Row, Col, Statistic, Badge, App } from "antd"
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined, BellOutlined } from "@ant-design/icons"
import type { Subscription, Wallet } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { formatCurrency } from "../data/currency-data"
import { currencies } from "../data/currency-data"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface SubscriptionManagerProps {
  subscriptions: Subscription[]
  wallets: Wallet[]
  onAdd: (data: Omit<Subscription, "id">) => Promise<void>
  onUpdate: (id: string, data: Omit<Subscription, "id">) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCharge: (id: string) => Promise<string | null>
}

function daysUntil(date: Date): number {
  return dayjs(date).startOf("day").diff(dayjs().startOf("day"), "day")
}

function DueBadge({ date }: { date: Date }) {
  const days = daysUntil(date)
  if (days < 0) return <Tag color="red">Overdue {Math.abs(days)}d</Tag>
  if (days === 0) return <Tag color="red">Due today</Tag>
  if (days <= 3) return <Tag color="orange">In {days}d</Tag>
  if (days <= 7) return <Tag color="gold">In {days}d</Tag>
  return <Tag color="default">In {days}d</Tag>
}

function SubscriptionForm({
  sub, wallets, open, onClose, onSave,
}: {
  sub?: Subscription
  wallets: Wallet[]
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Subscription, "id">) => Promise<void>
}) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [selCurrency, setSelCurrency] = useState("USD")

  useEffect(() => {
    if (open) {
      if (sub) {
        setSelCurrency(sub.currency)
        form.setFieldsValue({
          name: sub.name, amount: sub.amount, currency: sub.currency,
          wallet: sub.wallet, category: sub.category, cycle: sub.cycle,
          nextDate: dayjs(sub.nextDate), description: sub.description, active: sub.active,
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ cycle: "monthly", currency: "USD", active: true, nextDate: dayjs().add(1, "month").startOf("month") })
        setSelCurrency("USD")
      }
    }
  }, [open])

  const handleOk = async () => {
    try {
      const v = await form.validateFields()
      setSaving(true)
      await onSave({
        name: v.name, amount: v.amount, currency: v.currency,
        wallet: v.wallet, category: v.category, cycle: v.cycle,
        nextDate: v.nextDate.toDate(), description: v.description || "",
        active: v.active ?? true,
      })
      onClose()
    } catch { } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open} onCancel={onClose} onOk={handleOk}
      title={sub ? "Edit Subscription" : "Add Subscription"}
      okText={sub ? "Update" : "Add"} confirmLoading={saving}
      destroyOnHidden width="min(90vw, 480px)"
    >
      <Form form={form} layout="vertical" className="mt-2">
        <Form.Item name="name" label="Service Name" rules={[{ required: true, message: "Enter a name" }]}>
          <Input placeholder="e.g. Netflix, iCloud, YouTube Premium" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} step={selCurrency === "KHR" ? 1 : 0.01} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
              <Select options={currencies.map((c) => ({ value: c.code, label: c.symbol + " " + c.code }))} onChange={setSelCurrency} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="cycle" label="Billing Cycle" rules={[{ required: true }]}>
              <Select options={[{ value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nextDate" label="Next Billing Date" rules={[{ required: true }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="wallet" label="Charge Wallet" rules={[{ required: true }]}>
          <Select options={wallets.map((w) => ({ value: w.name, label: w.name + " — " + formatCurrency(w.balance, w.currency) }))} />
        </Form.Item>
        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
          <Select options={defaultCategories.map((c) => ({ value: c.name, label: c.icon + " " + c.name }))} />
        </Form.Item>
        <Form.Item name="description" label="Notes">
          <Input placeholder="Optional notes" />
        </Form.Item>
        <Form.Item name="active" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export function SubscriptionManager({ subscriptions, wallets, onAdd, onUpdate, onDelete, onCharge }: SubscriptionManagerProps) {
  const { message } = App.useApp()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | undefined>()
  const [charging, setCharging] = useState<string | null>(null)

  const sorted = [...subscriptions].sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate))
  const active = subscriptions.filter((s) => s.active)
  const overdue = subscriptions.filter((s) => s.active && daysUntil(s.nextDate) < 0)
  const dueSoon = subscriptions.filter((s) => s.active && daysUntil(s.nextDate) >= 0 && daysUntil(s.nextDate) <= 7)

  const monthlyTotal = active.reduce((sum, s) => {
    const amt = s.currency === "USD" ? s.amount : s.amount / 4100
    if (s.cycle === "monthly") return sum + amt
    if (s.cycle === "yearly") return sum + amt / 12
    if (s.cycle === "weekly") return sum + amt * 4.33
    return sum
  }, 0)

  const handleCharge = async (id: string) => {
    setCharging(id)
    try {
      const err = await onCharge(id)
      if (err) message.error(err)
      else message.success("Charged and expense recorded!")
    } finally {
      setCharging(null)
    }
  }

  const columns: ColumnsType<Subscription> = [
    {
      title: "Subscription",
      key: "name",
      render: (_, r) => (
        <div>
          <p className="font-medium text-sm">{r.name}</p>
          <p className="text-xs text-gray-400 capitalize">{r.cycle} · {r.wallet}</p>
        </div>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      render: (_, r) => (
        <span className="font-semibold text-sm">{formatCurrency(r.amount, r.currency)}</span>
      ),
    },
    {
      title: "Next Due",
      key: "nextDate",
      render: (_, r) => (
        <div>
          <p className="text-xs text-gray-600 mb-1">{dayjs(r.nextDate).format("DD/MM/YYYY")}</p>
          {r.active && <DueBadge date={r.nextDate} />}
        </div>
      ),
      sorter: (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime(),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      responsive: ["md"],
      render: (cat: string) => {
        const c = defaultCategories.find((x) => x.name === cat)
        return <Tag style={{ background: (c?.color ?? "#6b7280") + "20", color: c?.color ?? "#6b7280", border: "1px solid " + (c?.color ?? "#6b7280") + "40" }} className="text-xs">{c?.icon} {cat}</Tag>
      },
    },
    {
      title: "Active",
      key: "active",
      render: (_, r) => (
        <Switch
          size="small"
          checked={r.active}
          onChange={(v) => onUpdate(r.id, { ...r, active: v, nextDate: new Date(r.nextDate) })}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Space size={2}>
          <Button
            size="small" type="primary" icon={<ThunderboltOutlined />}
            loading={charging === r.id}
            disabled={!r.active}
            onClick={() => handleCharge(r.id)}
            title="Charge now"
          />
          <Button size="small" type="text" icon={<EditOutlined />}
            onClick={() => { setEditing(r); setFormOpen(true) }} />
          <Popconfirm title="Delete subscription?" onConfirm={() => onDelete(r.id)}
            okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Total Subscriptions" value={subscriptions.length} prefix={<BellOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Active" value={active.length} styles={{ content: { color: "#16a34a" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Due This Week" value={dueSoon.length + overdue.length}
              styles={{ content: { color: dueSoon.length + overdue.length > 0 ? "#ef4444" : "#6b7280" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Est. Monthly Cost" value={`$${monthlyTotal.toFixed(2)}`}
              styles={{ content: { color: "#6366f1", fontSize: 15 } }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            <BellOutlined className="mr-2" />
            Subscriptions
            {overdue.length > 0 && <Badge count={overdue.length} style={{ marginLeft: 8, background: "#ef4444" }} />}
          </span>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true) }} style={{ height: 40 }}>
            <span className="hidden sm:inline">Add Subscription</span>
          </Button>
        }
      >
        <Table
          dataSource={sorted} columns={columns} rowKey="id"
          pagination={false} size="small" scroll={{ x: true }}
          rowClassName={(r) => r.active && daysUntil(r.nextDate) < 0 ? "bg-red-50" : r.active && daysUntil(r.nextDate) <= 3 ? "bg-orange-50" : ""}
          locale={{ emptyText: "No subscriptions yet. Add your first recurring expense." }}
        />
      </Card>

      <SubscriptionForm
        sub={editing} wallets={wallets} open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(undefined) }}
        onSave={(data) => editing ? onUpdate(editing.id, data) : onAdd(data)}
      />
    </div>
  )
}