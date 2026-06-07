"use client"

import React, { useState, useEffect } from "react"
import { App, ConfigProvider, Tabs, Button, Avatar, Dropdown, Spin, Modal, Space, Typography } from "antd"
import { UserOutlined, LogoutOutlined, CloudSyncOutlined, ImportOutlined, DeleteOutlined } from "@ant-design/icons"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { auth } from "./lib/firebase"
import { useFirebaseData } from "./hooks/use-firebase-data"
import { AuthScreen } from "./components/auth-screen"
import { ExpenseForm } from "./components/expense-form"
import { IncomeForm } from "./components/income-form"
import { ExpenseDashboard } from "./components/expense-dashboard"
import { ExpenseList } from "./components/expense-list"
import { WalletManager } from "./components/wallet-manager"
import { WalletTransfer } from "./components/wallet-transfer"
import { ExportSummary } from "./components/export-summary"
import { ImportButton } from "./components/import-button"
import { SubscriptionManager } from "./components/subscription-manager"

export default function ExpenseTracker() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false) })
    return unsub
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large"><div className="p-8 text-gray-400 text-sm">Loading…</div></Spin>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#6366f1", borderRadius: 10 } }}>
      <App>
        <AppContent user={user} />
      </App>
    </ConfigProvider>
  )
}

function AppContent({ user }: { user: User }) {
  const { message } = App.useApp()
  const {
    expenses, wallets, subscriptions, loaded,
    addExpense, importExpenses, addIncome,
    updateExpense, deleteExpense,
    addWallet, updateWallet, deleteWallet,
    adjustWalletBalance, handleWalletTransfer,
    addSubscription, updateSubscription, deleteSubscription, chargeSubscription,
    clearAllData, hasLocalStorageData, migrateFromLocalStorage,
  } = useFirebaseData(user.uid)

  const [migrationOpen, setMigrationOpen] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (loaded && expenses.length === 0 && wallets.length === 0 && hasLocalStorageData()) {
      setMigrationOpen(true)
    }
  }, [loaded])

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      await migrateFromLocalStorage()
      message.success("Data imported from browser successfully!")
    } catch {
      message.error("Import failed. Your local data is still intact.")
    } finally { setMigrating(false); setMigrationOpen(false) }
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await clearAllData()
      message.success("All data cleared.")
    } catch {
      message.error("Failed to clear data.")
    } finally { setClearing(false); setClearOpen(false) }
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Spin size="large" />
        <Typography.Text type="secondary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CloudSyncOutlined /> Syncing your data…
        </Typography.Text>
      </div>
    )
  }

  const overdueCount = subscriptions.filter((s) => {
    if (!s.active) return false
    const days = Math.ceil((new Date(s.nextDate).getTime() - Date.now()) / 86400000)
    return days <= 0
  }).length

  const userMenu = {
    items: [
      { key: "email", label: <span className="text-gray-500 text-sm">{user.email}</span>, disabled: true },
      { type: "divider" as const },
      ...(hasLocalStorageData() ? [{ key: "migrate", label: "Import data from this browser", icon: <ImportOutlined />, onClick: () => setMigrationOpen(true) }] : []),
      { key: "clear", label: <span className="text-red-500">Clear all data</span>, icon: <DeleteOutlined className="text-red-500" />, onClick: () => setClearOpen(true) },
      { type: "divider" as const },
      { key: "signout", label: "Sign out", icon: <LogoutOutlined />, onClick: () => signOut(auth) },
    ],
  }

  const tabItems = [
    {
      key: "dashboard",
      label: <span className="text-xs sm:text-sm">Dashboard</span>,
      children: <ExpenseDashboard expenses={expenses} />,
    },
    {
      key: "expenses",
      label: <span className="text-xs sm:text-sm">Transactions</span>,
      children: <ExpenseList expenses={expenses} wallets={wallets} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} />,
    },
    {
      key: "wallets",
      label: <span className="text-xs sm:text-sm">Wallets</span>,
      children: (
        <WalletManager
          wallets={wallets} expenses={expenses}
          onAddWallet={addWallet} onUpdateWallet={updateWallet}
          onDeleteWallet={deleteWallet} onAdjustBalance={adjustWalletBalance}
        />
      ),
    },
    {
      key: "subscriptions",
      label: (
        <span className="text-xs sm:text-sm">
          Subscriptions
          {overdueCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs">{overdueCount}</span>}
        </span>
      ),
      children: (
        <SubscriptionManager
          subscriptions={subscriptions} wallets={wallets}
          onAdd={addSubscription} onUpdate={updateSubscription}
          onDelete={deleteSubscription} onCharge={chargeSubscription}
        />
      ),
    },
    {
      key: "transfer",
      label: <span className="text-xs sm:text-sm">Transfer</span>,
      children: <WalletTransfer wallets={wallets} onTransfer={handleWalletTransfer} />,
    },
    {
      key: "export",
      label: <span className="text-xs sm:text-sm">Export</span>,
      children: <ExportSummary expenses={expenses} wallets={wallets} subscriptions={subscriptions} />,
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f5" }}>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">💰 Expense Tracker</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Real-time sync across all devices</p>
            </div>
            <div className="flex items-center gap-2">
              <ImportButton onImport={importExpenses} existingExpenses={expenses} />
              <IncomeForm wallets={wallets} onSubmit={addIncome} />
              <ExpenseForm wallets={wallets} onSubmit={addExpense} />
              <Dropdown menu={userMenu} placement="bottomRight">
                <Button type="text" className="p-0 h-auto">
                  <Avatar src={user.photoURL} icon={!user.photoURL ? <UserOutlined /> : undefined}
                    size={36} className="cursor-pointer" style={{ background: "#6366f1" }} />
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 pb-safe">
        <Tabs defaultValue="dashboard" items={tabItems} className="expense-tabs" size="large" style={{ background: "transparent" }} />
      </div>

      <Modal open={migrationOpen} title="Import existing data?" onCancel={() => setMigrationOpen(false)}
        footer={<Space><Button onClick={() => setMigrationOpen(false)}>Skip</Button><Button type="primary" loading={migrating} onClick={handleMigrate}>Import to cloud</Button></Space>}>
        <p className="text-gray-600">We found existing data saved in this browser. Would you like to import it into your account so it syncs across all your devices?</p>
        <p className="text-gray-400 text-sm mt-2">This happens once. Your data will be moved from local storage to the cloud.</p>
      </Modal>

      <Modal open={clearOpen} title="Clear all data?" onCancel={() => setClearOpen(false)}
        footer={<Space><Button onClick={() => setClearOpen(false)}>Cancel</Button><Button danger loading={clearing} onClick={handleClearAll}>Yes, delete everything</Button></Space>}>
        <p className="text-gray-600">This will permanently delete all your expenses, wallets, and subscriptions from the cloud. This cannot be undone.</p>
      </Modal>
    </div>
  )
}