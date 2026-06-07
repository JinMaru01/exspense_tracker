"use client"

import { useState } from "react"
import { Table, Input, Select, Button, Tag, Card, Space, Popconfirm, DatePicker } from "antd"
import type { ColumnsType } from "antd/es/table"
import { SearchOutlined, DeleteOutlined, ClearOutlined } from "@ant-design/icons"
import type { Expense, Wallet } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { ExpenseForm } from "./expense-form"
import { DownloadButton } from "./download-button"
import { formatCurrency } from "../data/currency-data"
import dayjs from "dayjs"

interface ExpenseListProps {
  expenses: Expense[]
  wallets: Wallet[]
  onUpdateExpense: (id: string, expense: Omit<Expense, "id">) => Promise<string | null | void> | string | null | void
  onDeleteExpense: (id: string) => Promise<void> | void
}

const typeColor: Record<string, string> = {
  income: "green",
  expense: "red",
  transfer: "blue",
}
const typeLabel: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
}

export function ExpenseList({ expenses, wallets, onUpdateExpense, onDeleteExpense }: ExpenseListProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [walletFilter, setWalletFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  const thisMonth = [dayjs().startOf("month"), dayjs().endOf("month")] as [dayjs.Dayjs, dayjs.Dayjs]
  const lastMonth = [
    dayjs().subtract(1, "month").startOf("month"),
    dayjs().subtract(1, "month").endOf("month"),
  ] as [dayjs.Dayjs, dayjs.Dayjs]

  const isRange = (r: [dayjs.Dayjs, dayjs.Dayjs]) =>
    dateRange && dateRange[0]?.isSame(r[0], "day") && dateRange[1]?.isSame(r[1], "day")

  const getCategoryColor = (name: string) =>
    defaultCategories.find((c) => c.name === name)?.color ?? "#6b7280"
  const getCategoryIcon = (name: string) =>
    defaultCategories.find((c) => c.name === name)?.icon ?? "💰"

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === "all" || e.category === categoryFilter
    const matchWallet = walletFilter === "all" || e.wallet === walletFilter
    const matchType = typeFilter === "all" || (e.type ?? "expense") === typeFilter
    let matchDate = true
    if (dateRange && dateRange[0] && dateRange[1]) {
      const d = dayjs(e.date)
      matchDate = !d.isBefore(dateRange[0], "day") && !d.isAfter(dateRange[1], "day")
    }
    return matchSearch && matchCat && matchWallet && matchType && matchDate
  })

  const columns: ColumnsType<Expense> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 100,
      render: (d: Date) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {dayjs(d).format("DD/MM/YYYY")}
        </span>
      ),
      sorter: (a: Expense, b: Expense) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 90,
      render: (type: string) => (
        <Tag color={typeColor[type ?? "expense"]} className="text-xs">
          {typeLabel[type ?? "expense"]}
        </Tag>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 140,
      responsive: ["sm"],
      render: (cat: string) => (
        <Tag
          className="text-xs"
          style={{
            background: getCategoryColor(cat) + "20",
            color: getCategoryColor(cat),
            border: "1px solid " + getCategoryColor(cat) + "40",
          }}
        >
          {getCategoryIcon(cat)} {cat}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (d: string) => <span className="text-xs text-gray-700">{d || "—"}</span>,
    },
    {
      title: "Wallet",
      dataIndex: "wallet",
      key: "wallet",
      width: 120,
      responsive: ["md"],
      render: (w: string, record: Expense) => (
        <Tag className="text-xs">{w} ({record.currency})</Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 110,
      align: "right" as const,
      render: (amount: number, record: Expense) => (
        <span
          className="font-semibold text-xs whitespace-nowrap"
          style={{ color: record.type === "income" ? "#16a34a" : record.type === "transfer" ? "#3b82f6" : "#ef4444" }}
        >
          {record.type === "income" ? "+" : record.type === "transfer" ? "" : "-"}
          {formatCurrency(amount, record.currency)}
        </span>
      ),
      sorter: (a: Expense, b: Expense) => a.amount - b.amount,
    },
    {
      title: "",
      key: "actions",
      width: 70,
      render: (_: unknown, record: Expense) => (
        <Space size={2}>
          <ExpenseForm
            expense={record}
            wallets={wallets}
            onSubmit={(updated) => onUpdateExpense(record.id, updated)}
          />
          <Popconfirm
            title="Delete this transaction?"
            onConfirm={() => onDeleteExpense(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="Transactions"
      extra={
        <DownloadButton
          expenses={expenses}
          filteredExpenses={filtered}
          searchTerm={search}
          categoryFilter={categoryFilter}
          walletFilter={walletFilter}
          showFilteredOption
        />
      }
    >
      <div className="space-y-3 mb-4">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Search by description or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ minWidth: 130 }}
            options={[
              { value: "all", label: "All Types" },
              { value: "expense", label: "Expenses" },
              { value: "income", label: "Income" },
              { value: "transfer", label: "Transfers" },
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ minWidth: 160 }}
            options={[
              { value: "all", label: "All Categories" },
              ...defaultCategories.map((c) => ({ value: c.name, label: c.icon + " " + c.name })),
            ]}
          />
          <Select
            value={walletFilter}
            onChange={setWalletFilter}
            style={{ minWidth: 150 }}
            options={[
              { value: "all", label: "All Wallets" },
              ...wallets.map((w) => ({ value: w.name, label: w.name })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="small" type={!dateRange ? "primary" : "default"} onClick={() => setDateRange(null)}>All Time</Button>
          <Button size="small" type={isRange(thisMonth) ? "primary" : "default"} onClick={() => setDateRange(thisMonth)}>This Month</Button>
          <Button size="small" type={isRange(lastMonth) ? "primary" : "default"} onClick={() => setDateRange(lastMonth)}>Last Month</Button>
          <DatePicker.RangePicker
            size="small"
            value={dateRange as [dayjs.Dayjs, dayjs.Dayjs] | null}
            onChange={(v) => setDateRange(v)}
            format="DD/MM/YYYY"
            className="flex-1"
          />
          {dateRange && (
            <Button size="small" icon={<ClearOutlined />} onClick={() => setDateRange(null)} />
          )}
        </div>
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        scroll={{ x: true }}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} records` }}
        size="small"
        locale={{ emptyText: "No transactions found." }}
      />
    </Card>
  )
}
