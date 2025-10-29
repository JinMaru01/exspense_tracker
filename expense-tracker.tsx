"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Expense, Wallet } from "./types/expense"
import { ExpenseForm } from "./components/expense-form"
import { ExpenseDashboard } from "./components/expense-dashboard"
import { ExpenseList } from "./components/expense-list"
import { ExportSummary } from "./components/export-summary"
import { WalletManager } from "./components/wallet-manager"

// Mock initial wallet data
const initialWallets: Wallet[] = [
  {
    id: "1",
    name: "Cash (Riel)",
    balance: 6150000,
    currency: "KHR",
    exchangeRate: 4100,
  },
  {
    id: "2",
    name: "Cash (Dollar)",
    balance: 500,
    currency: "USD",
    exchangeRate: 1,
  },
  {
    id: "3",
    name: "ABA Bank (USD)",
    balance: 2500,
    currency: "USD",
    exchangeRate: 1,
  },
  {
    id: "4",
    name: "ACLEDA Bank (KHR)",
    balance: 12300000,
    currency: "KHR",
    exchangeRate: 4100,
  },
  {
    id: "5",
    name: "Credit Card (USD)",
    balance: 1800,
    currency: "USD",
    exchangeRate: 1,
  },
]

// Mock initial data
const initialExpenses: Expense[] = [
  {
    id: "1",
    amount: 45.5,
    category: "Food & Dining",
    wallet: "Cash (Dollar)",
    description: "Lunch at Italian restaurant",
    date: new Date("2024-01-15"),
    currency: "USD",
  },
  {
    id: "2",
    amount: 492000,
    category: "Transportation",
    wallet: "Cash (Riel)",
    description: "Gas for car",
    date: new Date("2024-01-14"),
    currency: "KHR",
  },
  {
    id: "3",
    amount: 89.99,
    category: "Shopping",
    wallet: "Credit Card (USD)",
    description: "New shoes",
    date: new Date("2024-01-13"),
    currency: "USD",
  },
  {
    id: "4",
    amount: 102500,
    category: "Entertainment",
    wallet: "ACLEDA Bank (KHR)",
    description: "Movie tickets",
    date: new Date("2024-01-12"),
    currency: "KHR",
  },
  {
    id: "5",
    amount: 150.0,
    category: "Bills & Utilities",
    wallet: "ABA Bank (USD)",
    description: "Electricity bill",
    date: new Date("2024-01-11"),
    currency: "USD",
  },
]

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets)

  const addExpense = (expenseData: Omit<Expense, "id">) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
    }
    setExpenses((prev) => [newExpense, ...prev])
  }

  const updateExpense = (id: string, expenseData: Omit<Expense, "id">) => {
    setExpenses((prev) => prev.map((expense) => (expense.id === id ? { ...expenseData, id } : expense)))
  }

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
  }

  // Wallet management functions
  const addWallet = (walletData: Omit<Wallet, "id">) => {
    const newWallet: Wallet = {
      ...walletData,
      id: Date.now().toString(),
    }
    setWallets((prev) => [...prev, newWallet])
  }

  const updateWallet = (id: string, walletData: Omit<Wallet, "id">) => {
    setWallets((prev) => prev.map((wallet) => (wallet.id === id ? { ...walletData, id } : wallet)))
  }

  const deleteWallet = (id: string) => {
    setWallets((prev) => prev.filter((wallet) => wallet.id !== id))
  }

  const adjustWalletBalance = (walletId: string, amount: number, type: "add" | "subtract", reason: string) => {
    setWallets((prev) =>
      prev.map((wallet) => {
        if (wallet.id === walletId) {
          const newBalance = type === "add" ? wallet.balance + amount : wallet.balance - amount
          return { ...wallet, balance: newBalance }
        }
        return wallet
      }),
    )

    // Optionally, you could also create a transaction record for balance adjustments
    if (reason) {
      const adjustmentExpense: Expense = {
        id: `adj_${Date.now()}`,
        amount: type === "subtract" ? amount : -amount, // Negative for income/deposits
        category: type === "add" ? "Income/Deposit" : "Fees/Withdrawal",
        wallet: wallets.find((w) => w.id === walletId)?.name || "",
        description: reason,
        date: new Date(),
        currency: wallets.find((w) => w.id === walletId)?.currency || "USD",
      }

      if (type === "subtract") {
        setExpenses((prev) => [adjustmentExpense, ...prev])
      }
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expense Tracker</h1>
          <p className="text-muted-foreground">
            Track and manage your expenses across different categories and wallets
          </p>
        </div>
        <ExpenseForm wallets={wallets} onSubmit={addExpense} />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ExpenseDashboard expenses={expenses} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <ExpenseList
            expenses={expenses}
            wallets={wallets}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
          />
        </TabsContent>

        <TabsContent value="wallets" className="space-y-6">
          <WalletManager
            wallets={wallets}
            expenses={expenses}
            onAddWallet={addWallet}
            onUpdateWallet={updateWallet}
            onDeleteWallet={deleteWallet}
          />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ExportSummary expenses={expenses} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
