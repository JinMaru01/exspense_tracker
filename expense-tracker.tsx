"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Expense, Wallet } from "./types/expense"
import { ExpenseForm } from "./components/expense-form"
import { ExpenseDashboard } from "./components/expense-dashboard"
import { ExpenseList } from "./components/expense-list"
import { ExportSummary } from "./components/export-summary"
import { WalletManager } from "./components/wallet-manager"
import { WalletTransfer } from "./components/wallet-transfer"
import { useLocalStorage } from "./hooks/use-local-storage"
import { defaultWallets } from "./data/default-data"

export default function ExpenseTracker() {
  const [expenses, setExpenses, expensesLoaded] = useLocalStorage<Expense[]>("expenses", [])
  const [wallets, setWallets, walletsLoaded] = useLocalStorage<Wallet[]>("wallets", defaultWallets)

  if (!expensesLoaded || !walletsLoaded) {
    return (
      <div className="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

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

  const handleWalletTransfer = (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    convertedAmount: number,
    note: string,
  ) => {
    const fromWallet = wallets.find((w) => w.id === fromWalletId)
    const toWallet = wallets.find((w) => w.id === toWalletId)

    if (!fromWallet || !toWallet) return

    // Update wallet balances
    setWallets((prev) =>
      prev.map((wallet) => {
        if (wallet.id === fromWalletId) {
          return { ...wallet, balance: wallet.balance - amount }
        }
        if (wallet.id === toWalletId) {
          return { ...wallet, balance: wallet.balance + convertedAmount }
        }
        return wallet
      }),
    )

    // Create transfer record as expense
    const transferExpense: Expense = {
      id: `transfer_${Date.now()}`,
      amount: amount,
      category: "Transfer",
      wallet: fromWallet.name,
      description:
        note ||
        `Transfer to ${toWallet.name}${fromWallet.currency !== toWallet.currency ? ` (${convertedAmount.toFixed(2)} ${toWallet.currency})` : ""}`,
      date: new Date(),
      currency: fromWallet.currency,
    }

    setExpenses((prev) => [transferExpense, ...prev])
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Expense Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track and manage your expenses across different categories and wallets
          </p>
        </div>
        <ExpenseForm wallets={wallets} onSubmit={addExpense} />
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="wallets" className="text-xs sm:text-sm">
            Wallets
          </TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs sm:text-sm">
            Transfer
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs sm:text-sm">
            Export
          </TabsTrigger>
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

        <TabsContent value="transfer" className="space-y-6">
          <WalletTransfer wallets={wallets} onTransfer={handleWalletTransfer} />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ExportSummary expenses={expenses} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
