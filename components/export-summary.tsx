"use client"

import { useMemo, useRef, useState } from "react"
import { App, Card, Row, Col, Statistic, Button, DatePicker, Progress, Table, Tag, Select, Space } from "antd"
import {
  ArrowUpOutlined, ArrowDownOutlined, SwapOutlined,
  DownloadOutlined, FilePdfOutlined, CalendarOutlined, LoadingOutlined,
} from "@ant-design/icons"
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts"
import type { Expense, Wallet, Subscription } from "../types/expense"
import { defaultCategories } from "../data/default-data"
import { formatCurrency, convertCurrency } from "../data/currency-data"
import { useExchangeRates } from "../hooks/use-exchange-rates"
import { exportToCSV } from "../utils/csv-export"
import dayjs from "dayjs"
import type { ColumnsType } from "antd/es/table"

interface ExportSummaryProps {
  expenses: Expense[]
  wallets: Wallet[]
  subscriptions: Subscription[]
}

type Preset = "all" | "thisMonth" | "lastMonth" | "custom"

export function ExportSummary({ expenses, wallets, subscriptions }: ExportSummaryProps) {
  const { message } = App.useApp()
  const [preset, setPreset] = useState<Preset>("all")
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD")
  const [pdfLoading, setPdfLoading] = useState(false)
  const ratesVersion = useExchangeRates()
  const reportRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const today = dayjs()
    if (preset === "thisMonth") {
      const s = today.startOf("month").toDate(); const e = today.endOf("month").toDate()
      return expenses.filter((x) => new Date(x.date) >= s && new Date(x.date) <= e)
    }
    if (preset === "lastMonth") {
      const s = today.subtract(1, "month").startOf("month").toDate()
      const e = today.subtract(1, "month").endOf("month").toDate()
      return expenses.filter((x) => new Date(x.date) >= s && new Date(x.date) <= e)
    }
    if (preset === "custom" && customRange?.[0] && customRange?.[1]) {
      const s = customRange[0].startOf("day").toDate(); const e = customRange[1].endOf("day").toDate()
      return expenses.filter((x) => new Date(x.date) >= s && new Date(x.date) <= e)
    }
    return expenses
  }, [expenses, preset, customRange])

  const only = (type: "expense" | "income" | "transfer") => filtered.filter((e) => (e.type ?? "expense") === type)

  const totalIncome = useMemo(() => only("income").reduce((s, e) => s + convertCurrency(e.amount, e.currency, currency), 0), [filtered, currency, ratesVersion])
  const totalExpenses = useMemo(() => only("expense").reduce((s, e) => s + convertCurrency(e.amount, e.currency, currency), 0), [filtered, currency, ratesVersion])
  const totalTransfers = useMemo(() => only("transfer").reduce((s, e) => s + convertCurrency(e.amount, e.currency, currency), 0), [filtered, currency, ratesVersion])
  const net = totalIncome - totalExpenses

  const dates = filtered.map((e) => new Date(e.date).getTime())
  const earliest = dates.length ? dayjs(Math.min(...dates)) : null
  const latest = dates.length ? dayjs(Math.max(...dates)) : null

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const e of only("expense")) {
      totals[e.category] = (totals[e.category] ?? 0) + convertCurrency(e.amount, e.currency, currency)
    }
    const total = Object.values(totals).reduce((s, v) => s + v, 0)
    return defaultCategories
      .map((cat) => ({ ...cat, total: totals[cat.name] ?? 0, pct: total > 0 ? ((totals[cat.name] ?? 0) / total) * 100 : 0 }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filtered, currency, ratesVersion])

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; sortKey: number; income: number; expense: number }> = {}
    for (const e of filtered) {
      const d = dayjs(e.date)
      const key = d.format("MMM YY")
      const sortKey = d.year() * 100 + d.month()
      if (!map[key]) map[key] = { month: key, sortKey, income: 0, expense: 0 }
      const amt = convertCurrency(e.amount, e.currency, currency)
      if ((e.type ?? "expense") === "income") map[key].income += amt
      else if ((e.type ?? "expense") === "expense") map[key].expense += amt
    }
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey).slice(-12)
  }, [filtered, currency, ratesVersion])

  const walletRows = useMemo(() => wallets.map((w) => {
    const wExp = only("expense").filter((e) => e.wallet === w.name)
    const wInc = only("income").filter((e) => e.wallet === w.name)
    const txCount = wExp.length + wInc.length + only("transfer").filter((e) => e.wallet === w.name).length
    return { id: w.id, name: w.name, currency: w.currency, balance: w.balance,
      spent: wExp.reduce((s, e) => s + e.amount, 0),
      received: wInc.reduce((s, e) => s + e.amount, 0), txCount }
  }).filter((r) => r.txCount > 0), [filtered, wallets])

  const walletColumns: ColumnsType<typeof walletRows[0]> = [
    { title: "Wallet", dataIndex: "name", key: "name", render: (n: string, r) => <div><p className="font-medium text-sm">{n}</p><p className="text-xs text-gray-400">{r.currency}</p></div> },
    { title: "Spent", key: "spent", align: "right" as const, render: (_, r) => <span className="text-red-500 text-sm">-{formatCurrency(r.spent, r.currency)}</span> },
    { title: "Income", key: "received", align: "right" as const, responsive: ["sm"], render: (_, r) => <span className="text-green-600 text-sm">+{formatCurrency(r.received, r.currency)}</span> },
    { title: "Txns", dataIndex: "txCount", key: "txCount", align: "center" as const, render: (v: number) => <Tag>{v}</Tag> },
    { title: "Balance", key: "balance", align: "right" as const, render: (_, r) => <span className={`font-bold text-sm ${r.balance < 0 ? "text-red-500" : "text-gray-800"}`}>{formatCurrency(r.balance, r.currency)}</span> },
  ]

  const fileLabel: Record<Preset, string> = {
    all: "all_expenses",
    thisMonth: `expenses_${dayjs().format("YYYY-MM")}`,
    lastMonth: `expenses_${dayjs().subtract(1, "month").format("YYYY-MM")}`,
    custom: customRange?.[0] && customRange?.[1] ? `expenses_${customRange[0].format("YYYYMMDD")}_${customRange[1].format("YYYYMMDD")}` : "expenses_custom",
  }

  const sym = currency === "USD" ? "$" : "r"
  const fmtShort = (v: number) => currency === "USD" ? `$${v.toFixed(2)}` : `${Math.round(v).toLocaleString()} r`

  const exportPDF = async () => {
    if (!reportRef.current) return
    setPdfLoading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f0f2f5",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        onclone: (doc) => {
          // Force all Card heads to have stable height so titles don't overlap chart bodies
          doc.querySelectorAll<HTMLElement>(".ant-card-head").forEach((el) => {
            el.style.position = "relative"
            el.style.zIndex = "1"
          })
          doc.querySelectorAll<HTMLElement>(".ant-card-body").forEach((el) => {
            el.style.position = "relative"
            el.style.zIndex = "0"
          })
        },
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      const pageH = pdf.internal.pageSize.getHeight()
      let y = 0
      while (y < pdfH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, -y, pdfW, pdfH)
        y += pageH
      }
      pdf.save(`${fileLabel[preset]}_report.pdf`)
      message.success("PDF saved!")
    } catch {
      message.error("PDF export failed.")
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Period:</span>
          <div className="flex gap-1 flex-wrap">
            {(["all", "thisMonth", "lastMonth"] as const).map((p) => (
              <Button key={p} size="small" type={preset === p ? "primary" : "default"}
                onClick={() => { setPreset(p); setCustomRange(null) }}>
                {p === "all" ? "All Time" : p === "thisMonth" ? "This Month" : "Last Month"}
              </Button>
            ))}
          </div>
          <DatePicker.RangePicker size="small"
            value={customRange as [dayjs.Dayjs, dayjs.Dayjs] | null}
            format="DD/MM/YYYY"
            onChange={(v) => { setCustomRange(v); setPreset(v ? "custom" : "all") }}
            placeholder={["From", "To"]} allowClear />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">Display:</span>
            <Select size="small" value={currency} onChange={setCurrency} style={{ width: 90 }}
              options={[{ value: "USD", label: "USD ($)" }, { value: "KHR", label: "KHR (r)" }]} />
          </div>
        </div>
        {earliest && latest && (
          <p className="text-xs text-gray-400 mt-2">
            <CalendarOutlined className="mr-1" />
            {earliest.format("DD/MM/YYYY")} — {latest.format("DD/MM/YYYY")}
            <span className="mx-2">·</span>{filtered.length} records
          </p>
        )}
      </Card>

      <div ref={reportRef} className="space-y-4">
        <Row gutter={[12, 12]}>
          {[
            { label: "Income", val: totalIncome, count: only("income").length, color: "#16a34a", icon: <ArrowUpOutlined />, sub: "Received" },
            { label: "Expenses", val: totalExpenses, count: only("expense").length, color: "#ef4444", icon: <ArrowDownOutlined />, sub: "Spent" },
            { label: "Transfers", val: totalTransfers, count: only("transfer").length, color: "#3b82f6", icon: <SwapOutlined />, sub: "Moved" },
            { label: "Net Balance", val: Math.abs(net), count: filtered.length, color: net >= 0 ? "#6366f1" : "#ef4444", icon: net >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />, sub: net >= 0 ? "Surplus" : "Deficit" },
          ].map(({ label, val, count, color, icon, sub }) => (
            <Col xs={12} sm={12} md={6} key={label}>
              <Card size="small" style={{ borderLeft: `3px solid ${color}` }}>
                <Statistic
                  title={<span className="text-xs">{label}</span>}
                  value={formatCurrency(val, currency)}
                  styles={{ content: { color, fontSize: 15, fontWeight: 700 } }}
                  prefix={icon}
                />
                <p className="text-xs text-gray-400 mt-1">{count} records · {sub}</p>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[12, 12]}>
          <Col xs={24} lg={14}>
            <Card title="Monthly Income vs Expenses" size="small">
              {monthlyData.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => sym + (currency === "USD" ? v.toFixed(0) : Math.round(v / 1000) + "k")} width={56} />
                    <RTooltip formatter={(v: number) => fmtShort(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Income" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Expense Breakdown" size="small">
              {categoryTotals.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No expense data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={categoryTotals} dataKey="total" nameKey="name" cx="50%" cy="50%"
                      outerRadius={80} innerRadius={40} paddingAngle={2}>
                      {categoryTotals.map((cat) => <Cell key={cat.id} fill={cat.color} />)}
                    </Pie>
                    <RTooltip formatter={(v: number) => fmtShort(v)} />
                    <Legend formatter={(value) => {
                      const cat = categoryTotals.find((c) => c.name === value)
                      return <span className="text-xs">{cat?.icon} {value}</span>
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Top Spending Categories" size="small">
          {categoryTotals.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No expense data for this period.</p>
          ) : (
            <Row gutter={[12, 8]}>
              {categoryTotals.slice(0, 8).map((cat) => (
                <Col xs={24} sm={12} key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{cat.icon} {cat.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatCurrency(cat.total, currency)}</span>
                      <span className="text-xs text-gray-400 ml-2">{cat.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress percent={Math.round(cat.pct)} strokeColor={cat.color} showInfo={false} size="small" />
                </Col>
              ))}
            </Row>
          )}
        </Card>

        <Card title="Wallet Activity" size="small">
          {walletRows.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No wallet activity for this period.</p>
          ) : (
            <Table dataSource={walletRows} columns={walletColumns} rowKey="id" pagination={false} size="small" scroll={{ x: true }} />
          )}
        </Card>

        {/* Subscriptions section */}
        {subscriptions.length > 0 && (
          <Card title="Subscriptions" size="small">
            <Row gutter={[12, 8]}>
              {subscriptions
                .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
                .map((sub) => {
                  const days = Math.ceil((new Date(sub.nextDate).getTime() - Date.now()) / 86400000)
                  return (
                    <Col xs={24} sm={12} md={8} key={sub.id}>
                      <div className={`p-3 rounded-lg border ${sub.active ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{sub.name}</span>
                          {sub.active
                            ? days <= 0
                              ? <Tag color="red" className="text-xs">Overdue</Tag>
                              : days <= 7
                                ? <Tag color="orange" className="text-xs">In {days}d</Tag>
                                : <Tag color="default" className="text-xs">In {days}d</Tag>
                            : <Tag className="text-xs">Inactive</Tag>}
                        </div>
                        <p className="text-sm font-semibold mt-1">{formatCurrency(sub.amount, sub.currency)}<span className="text-xs text-gray-400 ml-1 capitalize">/ {sub.cycle}</span></p>
                        <p className="text-xs text-gray-400">{sub.wallet} · Due {dayjs(sub.nextDate).format("DD/MM/YYYY")}</p>
                      </div>
                    </Col>
                  )
                })}
            </Row>
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
              <span className="text-gray-500">Active: <strong>{subscriptions.filter(s => s.active).length}</strong></span>
              <span className="text-gray-500">Est. monthly: <strong className="text-indigo-600">
                ${subscriptions.filter(s => s.active).reduce((sum, s) => {
                  const amt = s.currency === "USD" ? s.amount : s.amount / 4100
                  return sum + (s.cycle === "monthly" ? amt : s.cycle === "yearly" ? amt / 12 : amt * 4.33)
                }, 0).toFixed(2)}
              </strong></span>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const rows = ["Name,Amount,Currency,Cycle,NextDate,Wallet,Category,Active"]
                  subscriptions.forEach(s => rows.push(`"${s.name}",${s.amount},${s.currency},${s.cycle},${dayjs(s.nextDate).format("DD/MM/YYYY")},"${s.wallet}","${s.category}",${s.active}`))
                  const blob = new Blob([rows.join("\n")], { type: "text/csv" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a"); a.href = url; a.download = "subscriptions.csv"; a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Export Subscriptions CSV
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Card size="small">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Export report</p>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono">{fileLabel[preset]}</span>
              <span className="mx-2">·</span>{filtered.length} records
              <span className="mx-2">·</span>
              <Tag color="blue" className="text-xs">CSV</Tag>
              <Tag color="red" className="text-xs">PDF</Tag>
            </p>
          </div>
          <Space wrap>
            <Button icon={<DownloadOutlined />} disabled={filtered.length === 0}
              onClick={() => exportToCSV(filtered, fileLabel[preset])} style={{ height: 40 }}>
              CSV ({filtered.length})
            </Button>
            <Button type="primary" icon={pdfLoading ? <LoadingOutlined /> : <FilePdfOutlined />}
              disabled={filtered.length === 0 || pdfLoading} onClick={exportPDF}
              style={{ height: 40, background: "#dc2626", borderColor: "#dc2626" }}>
              {pdfLoading ? "Generating…" : "Export PDF"}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}