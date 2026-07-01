"use client"

import { useMemo, useState } from "react"
import { Card, Row, Col, Progress, Select, Button, Statistic, Tabs, DatePicker } from "antd"
import { ArrowUpOutlined, ArrowDownOutlined, SwapOutlined } from "@ant-design/icons"
import type { Expense } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { DownloadButton } from "./download-button"
import { CurrencyConverter } from "./currency-converter"
import { formatCurrency, convertCurrency } from "../data/currency-data"
import { useExchangeRates } from "../hooks/use-exchange-rates"
import dayjs from "dayjs"

interface ExpenseDashboardProps {
  expenses: Expense[]
}

export function ExpenseDashboard({ expenses }: ExpenseDashboardProps) {
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "KHR">("USD")
  const [filterType, setFilterType] = useState<"all" | "thisMonth" | "lastMonth" | "custom">("all")
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const ratesVersion = useExchangeRates()

  const filtered = useMemo(() => {
    const today = dayjs()
    if (filterType === "thisMonth") {
      const start = today.startOf("month").toDate()
      const end = today.endOf("month").toDate()
      return expenses.filter((e) => new Date(e.date) >= start && new Date(e.date) <= end)
    }
    if (filterType === "lastMonth") {
      const start = today.subtract(1, "month").startOf("month").toDate()
      const end = today.subtract(1, "month").endOf("month").toDate()
      return expenses.filter((e) => new Date(e.date) >= start && new Date(e.date) <= end)
    }
    if (filterType === "custom" && customRange?.[0] && customRange?.[1]) {
      const start = customRange[0].startOf("day").toDate()
      const end = customRange[1].endOf("day").toDate()
      return expenses.filter((e) => new Date(e.date) >= start && new Date(e.date) <= end)
    }
    return expenses
  }, [expenses, filterType, customRange])

  const onlyExpenses = useMemo(() => filtered.filter((e) => e.type === "expense" || !e.type), [filtered])
  const onlyIncome = useMemo(() => filtered.filter((e) => e.type === "income"), [filtered])
  const onlyTransfers = useMemo(() => filtered.filter((e) => e.type === "transfer"), [filtered])

  const totalIncome = useMemo(
    () => onlyIncome.reduce((s, e) => s + convertCurrency(e.amount, e.currency, displayCurrency), 0),
    [onlyIncome, displayCurrency, ratesVersion],
  )
  const totalExpenses = useMemo(
    () => onlyExpenses.reduce((s, e) => s + convertCurrency(e.amount, e.currency, displayCurrency), 0),
    [onlyExpenses, displayCurrency, ratesVersion],
  )
  const totalTransfers = useMemo(
    () => onlyTransfers.reduce((s, e) => s + convertCurrency(e.amount, e.currency, displayCurrency), 0),
    [onlyTransfers, displayCurrency, ratesVersion],
  )
  const net = totalIncome - totalExpenses

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of onlyExpenses) {
      totals[e.category] = (totals[e.category] ?? 0) + convertCurrency(e.amount, e.currency, displayCurrency)
    }
    const total = Object.values(totals).reduce((s, v) => s + v, 0)
    return defaultCategories
      .map((cat) => ({
        ...cat,
        total: totals[cat.name] ?? 0,
        pct: total > 0 ? ((totals[cat.name] ?? 0) / total) * 100 : 0,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [onlyExpenses, displayCurrency, ratesVersion])

  const netColor = net >= 0 ? "#16a34a" : "#ef4444"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {(["all", "thisMonth", "lastMonth"] as const).map((f) => (
            <Button
              key={f}
              size="small"
              type={filterType === f ? "primary" : "default"}
              onClick={() => { setFilterType(f); setCustomRange(null) }}
            >
              {f === "all" ? "All Time" : f === "thisMonth" ? "This Month" : "Last Month"}
            </Button>
          ))}
        </div>
        <DatePicker.RangePicker
          size="small"
          value={customRange as [dayjs.Dayjs, dayjs.Dayjs] | null}
          format="DD/MM/YYYY"
          onChange={(v) => {
            setCustomRange(v)
            setFilterType(v ? "custom" : "all")
          }}
          placeholder={["From", "To"]}
          allowClear
        />
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Display:</span>
          <Select
            value={displayCurrency}
            onChange={(v) => setDisplayCurrency(v)}
            size="small"
            style={{ width: 90 }}
            options={[{ value: "USD", label: "USD ($)" }, { value: "KHR", label: "KHR (r)" }]}
          />
          <DownloadButton expenses={filtered} />
        </div>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: "3px solid #16a34a" }}>
            <Statistic
              title={<span className="text-xs">Total Income</span>}
              value={formatCurrency(totalIncome, displayCurrency)}
              styles={{ content: { color: "#16a34a", fontSize: 16, fontWeight: 700 } }}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: "3px solid #ef4444" }}>
            <Statistic
              title={<span className="text-xs">Total Expenses</span>}
              value={formatCurrency(totalExpenses, displayCurrency)}
              styles={{ content: { color: "#ef4444", fontSize: 16, fontWeight: 700 } }}
              prefix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: "3px solid #3b82f6" }}>
            <Statistic
              title={<span className="text-xs">Transfers</span>}
              value={formatCurrency(totalTransfers, displayCurrency)}
              styles={{ content: { color: "#3b82f6", fontSize: 16, fontWeight: 700 } }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" style={{ borderLeft: "3px solid " + netColor }}>
            <Statistic
              title={<span className="text-xs">Net Balance</span>}
              value={formatCurrency(Math.abs(net), displayCurrency)}
              styles={{ content: { color: netColor, fontSize: 16, fontWeight: 700 } }}
              prefix={net >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          size="small"
          items={[
            {
              key: "categories",
              label: "By Category",
              children:
                categoryTotals.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No expense data for this period.</p>
                ) : (
                  <Row gutter={[12, 12]} className="mt-2">
                    {categoryTotals.map((cat) => (
                      <Col xs={24} sm={12} lg={8} key={cat.id}>
                        <Card size="small">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {cat.icon} {cat.name}
                            </span>
                            <span className="text-xs text-gray-400">{cat.pct.toFixed(1)}%</span>
                          </div>
                          <p className="font-bold text-base mb-2">{formatCurrency(cat.total, displayCurrency)}</p>
                          <Progress percent={Math.round(cat.pct)} strokeColor={cat.color} showInfo={false} size="small" />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
            },
            {
              key: "converter",
              label: "Currency Converter",
              children: <CurrencyConverter />,
            },
          ]}
        />
      </Card>
    </div>
  )
}
