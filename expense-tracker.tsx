"use client"

import React, { useState, useEffect } from "react"
import { App, ConfigProvider, Tabs, Button, Avatar, Badge, Dropdown, Spin, Modal, Space, Typography } from "antd"
import {
  UserOutlined, LogoutOutlined, CloudSyncOutlined, ImportOutlined, DeleteOutlined,
  PieChartOutlined, UnorderedListOutlined, WalletOutlined, CalendarOutlined, SwapOutlined, FileTextOutlined,
} from "@ant-design/icons"
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

  return (
    // "lotus & warmth" antd tokens — the one place the theme lives (mirrors tailwind.config.ts)
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#c5345d",
          colorTextBase: "#2e211b",
          colorBgLayout: "#faf7f2",
          colorBorderSecondary: "#e8dbca",
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      }}
    >
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Spin size="large"><div className="p-8 text-warmth-500 text-sm">Loading…</div></Spin>
        </div>
      ) : !user ? (
        <AuthScreen />
      ) : (
        <App>
          <AppContent user={user} />
        </App>
      )}
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
  const [tab, setTab] = useState("dashboard")

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
      { key: "email", label: <span className="text-warmth-500 text-sm">{user.email}</span>, disabled: true },
      { type: "divider" as const },
      // Export has no slot in the 5-item mobile tab bar, so it lives here too
      { key: "export", label: "Export report", icon: <FileTextOutlined />, onClick: () => setTab("export") },
      ...(hasLocalStorageData() ? [{ key: "migrate", label: "Import data from this browser", icon: <ImportOutlined />, onClick: () => setMigrationOpen(true) }] : []),
      { key: "clear", label: <span className="text-red-500">Clear all data</span>, icon: <DeleteOutlined className="text-red-500" />, onClick: () => setClearOpen(true) },
      { type: "divider" as const },
      { key: "signout", label: "Sign out", icon: <LogoutOutlined />, onClick: () => signOut(auth) },
    ],
  }

  const tabItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <PieChartOutlined />,
      children: <ExpenseDashboard expenses={expenses} />,
    },
    {
      key: "expenses",
      label: "Transactions",
      icon: <UnorderedListOutlined />,
      children: <ExpenseList expenses={expenses} wallets={wallets} onUpdateExpense={updateExpense} onDeleteExpense={deleteExpense} />,
    },
    {
      key: "wallets",
      label: "Wallets",
      icon: <WalletOutlined />,
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
      label: "Subscriptions",
      icon: <CalendarOutlined />,
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
      label: "Transfer",
      icon: <SwapOutlined />,
      children: <WalletTransfer wallets={wallets} onTransfer={handleWalletTransfer} />,
    },
    {
      key: "export",
      label: "Export",
      icon: <FileTextOutlined />,
      children: <ExportSummary expenses={expenses} wallets={wallets} subscriptions={subscriptions} />,
    },
  ]

  const badge = (key: string) => (key === "subscriptions" ? overdueCount : 0)

  return (
    <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-warmth-200/80 bg-warmth-50/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-lotus-200 bg-lotus-50 text-xl shadow-soft">🪷</div>
          <div className="hidden shrink-0 whitespace-nowrap sm:block lg:hidden xl:block">
            <h1 className="text-lg font-bold leading-tight text-warmth-950">Expense Tracker</h1>
            <p className="text-xs text-warmth-500 lg:hidden">Real-time sync across all devices</p>
          </div>

          <nav className="ml-4 hidden gap-1 lg:flex">
            {tabItems.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-current={tab === key ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? "border-lotus-200 bg-lotus-50 text-lotus-700"
                    : "border-transparent text-warmth-700 hover:bg-warmth-100"
                }`}
              >
                {label}
                <Badge count={badge(key)} size="small" />
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ImportButton onImport={importExpenses} existingExpenses={expenses} />
            <IncomeForm wallets={wallets} onSubmit={addIncome} />
            <ExpenseForm wallets={wallets} onSubmit={addExpense} />
            <Dropdown menu={userMenu} placement="bottomRight">
              <Button type="text" className="p-0 h-auto" aria-label="Account menu">
                <Avatar src={user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : undefined} icon={!user.photoURL ? <UserOutlined /> : undefined}
                  size={36} className="cursor-pointer" style={{ background: "#c5345d" }} />
              </Button>
            </Dropdown>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
        {/* antd Tabs only for its keep-visited-panes-mounted behaviour; the nav above/below replaces its bar */}
        <Tabs activeKey={tab} items={tabItems} renderTabBar={() => <></>} />
      </main>

      <footer className="hidden border-t border-warmth-200 bg-white/80 py-4 text-center text-xs text-warmth-500 backdrop-blur-sm lg:block">
        🪷 Your data is private. Only you can see it.
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-warmth-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md justify-around px-1 py-1.5">
          {tabItems.slice(0, 5).map(({ key, label, icon }) => {
            const color = tab === key ? "text-lotus-700" : "text-warmth-600"
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-current={tab === key ? "page" : undefined}
                className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-[11px] font-medium ${color} ${
                  tab === key ? "bg-lotus-50" : ""
                }`}
              >
                <Badge count={badge(key)} size="small">
                  <span className={`text-lg leading-none ${color}`}>{icon}</span>
                </Badge>
                {label}
              </button>
            )
          })}
        </div>
      </nav>

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