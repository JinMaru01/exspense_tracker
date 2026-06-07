"use client"

import { Card, Table, Tag, Button, Popconfirm, Statistic, Row, Col, Tooltip } from "antd"
import type { ColumnsType } from "antd/es/table"
import { WalletOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons"
import type { Wallet as WalletType, Expense } from "../types/expense"
import { WalletForm } from "./wallet-form"
import { BalanceAdjustment } from "./balance-adjustment"
import { formatCurrency, convertCurrency } from "../data/currency-data"

interface WalletManagerProps {
  wallets: WalletType[]
  expenses: Expense[]
  onAddWallet: (wallet: Omit<WalletType, "id">) => Promise<void> | void
  onUpdateWallet: (id: string, wallet: Omit<WalletType, "id">) => Promise<void> | void
  onDeleteWallet: (id: string) => Promise<void> | void
  onAdjustBalance: (walletId: string, amount: number, type: "add" | "subtract", reason: string) => Promise<void> | void
}

export function WalletManager({
  wallets, expenses, onAddWallet, onUpdateWallet, onDeleteWallet, onAdjustBalance,
}: WalletManagerProps) {
  const totalPortfolioUSD = wallets.reduce(
    (sum, w) => sum + convertCurrency(w.balance, w.currency, "USD"), 0,
  )

  const canDelete = (walletId: string) => {
    const w = wallets.find((x) => x.id === walletId)
    return w ? !expenses.some((e) => e.wallet === w.name) : false
  }

  const getWalletStats = (wallet: WalletType) => {
    const txs = expenses.filter((e) => e.wallet === wallet.name)
    const totalSpent = txs
      .filter((e) => e.type === "expense" || !e.type)
      .reduce((s, e) => s + e.amount, 0)
    return { totalSpent, txCount: txs.length }
  }

  const columns: ColumnsType<WalletType> = [
    {
      title: "Wallet",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <span className="font-medium flex items-center gap-2">
          <WalletOutlined className="text-indigo-400" />
          {name}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      responsive: ["sm"],
      render: (type: string) => <Tag className="capitalize">{type}</Tag>,
    },
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
      render: (cur: string) => <Tag color="blue">{cur}</Tag>,
    },
    {
      title: "Spent",
      key: "spent",
      responsive: ["md"],
      render: (_: unknown, record: WalletType) => {
        const { totalSpent } = getWalletStats(record)
        return totalSpent > 0 ? (
          <span className="text-red-500">-{formatCurrency(totalSpent, record.currency)}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )
      },
    },
    {
      title: "Balance",
      key: "balance",
      render: (_: unknown, record: WalletType) => {
        const neg = record.balance < 0
        return (
          <span className={`font-semibold ${neg ? "text-red-500" : "text-green-600"}`}>
            {neg ? <ArrowDownOutlined /> : <ArrowUpOutlined />}{" "}
            {formatCurrency(Math.abs(record.balance), record.currency)}
          </span>
        )
      },
    },
    {
      title: "Txns",
      key: "txns",
      responsive: ["sm"],
      render: (_: unknown, record: WalletType) => {
        const { txCount } = getWalletStats(record)
        return <Tag>{txCount}</Tag>
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: WalletType) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Tooltip title={record.locked ? "Unlock wallet" : "Lock wallet"}>
            <Popconfirm
              title={record.locked ? "Unlock this wallet?" : "Lock this wallet?"}
              description={record.locked ? "Transactions will no longer require confirmation." : "Any transaction from this wallet will require confirmation."}
              onConfirm={() => onUpdateWallet(record.id, { ...record, locked: !record.locked })}
              okText={record.locked ? "Unlock" : "Lock"}
              cancelText="Cancel"
            >
              <Button
                type="text"
                size="small"
                icon={record.locked ? <LockOutlined style={{ color: "#f59e0b" }} /> : <UnlockOutlined style={{ color: "#9ca3af" }} />}
              />
            </Popconfirm>
          </Tooltip>
          <BalanceAdjustment wallet={record} onAdjustBalance={onAdjustBalance} />
          <WalletForm wallet={record} onSubmit={(data) => onUpdateWallet(record.id, data)} />
          <Popconfirm
            title="Delete wallet?"
            description={
              canDelete(record.id)
                ? "This cannot be undone."
                : "This wallet has transactions and cannot be deleted."
            }
            onConfirm={() => canDelete(record.id) && onDeleteWallet(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true, disabled: !canDelete(record.id) }}
            cancelText="Cancel"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!canDelete(record.id)}
            />
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Portfolio stats */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic title="Total Wallets" value={wallets.length} prefix={<WalletOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="Portfolio (USD)"
              value={totalPortfolioUSD.toFixed(2)}
              prefix="$"
              valueStyle={{ color: "#6366f1" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="USD Wallets"
              value={wallets.filter((w) => w.currency === "USD").length}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="KHR Wallets"
              value={wallets.filter((w) => w.currency === "KHR").length}
            />
          </Card>
        </Col>
      </Row>

      {/* Wallet table */}
      <Card
        title="Manage Wallets"
        extra={<WalletForm onSubmit={onAddWallet} />}
      >
        <Table
          dataSource={wallets}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: true }}
          locale={{ emptyText: "No wallets yet. Create your first wallet." }}
          size="middle"
        />
      </Card>
    </div>
  )
}
