"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, TrendingUp, TrendingDown } from "lucide-react"
import type { Wallet as WalletType, Expense } from "../types/expense"
import { WalletForm } from "./wallet-form"
import { formatCurrency, convertCurrency } from "../data/currency-data"

interface WalletManagerProps {
  wallets: WalletType[]
  expenses: Expense[]
  onAddWallet: (wallet: Omit<WalletType, "id">) => void
  onUpdateWallet: (id: string, wallet: Omit<WalletType, "id">) => void
  onDeleteWallet: (id: string) => void
}

export function WalletManager({ wallets, expenses, onAddWallet, onUpdateWallet, onDeleteWallet }: WalletManagerProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  // Calculate wallet statistics
  const getWalletStats = (wallet: WalletType) => {
    const walletExpenses = expenses.filter((expense) => expense.wallet === wallet.name)
    const totalSpent = walletExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const currentBalance = wallet.balance - totalSpent
    const transactionCount = walletExpenses.length

    return {
      totalSpent,
      currentBalance,
      transactionCount,
      initialBalance: wallet.balance,
    }
  }

  // Calculate total portfolio value in USD
  const totalPortfolioUSD = wallets.reduce((sum, wallet) => {
    const stats = getWalletStats(wallet)
    return sum + convertCurrency(stats.currentBalance, wallet.currency, "USD")
  }, 0)

  const canDeleteWallet = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return false
    return !expenses.some((expense) => expense.wallet === wallet.name)
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioUSD, "USD")}</div>
            <p className="text-xs text-muted-foreground">Current balance across all wallets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USD Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.filter((w) => w.currency === "USD").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KHR Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.filter((w) => w.currency === "KHR").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manage Wallets</CardTitle>
            <WalletForm onSubmit={onAddWallet} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Initial Balance</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead className="text-center">Transactions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No wallets found. Create your first wallet to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  wallets.map((wallet) => {
                    const stats = getWalletStats(wallet)
                    const isNegative = stats.currentBalance < 0

                    return (
                      <TableRow key={wallet.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                            {wallet.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{wallet.currency}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stats.initialBalance, wallet.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {stats.totalSpent > 0 ? (
                            <span className="text-red-600">-{formatCurrency(stats.totalSpent, wallet.currency)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isNegative ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            <span className={isNegative ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                              {formatCurrency(Math.abs(stats.currentBalance), wallet.currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{stats.transactionCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <WalletForm
                              wallet={wallet}
                              onSubmit={(updatedWallet) => onUpdateWallet(wallet.id, updatedWallet)}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!canDeleteWallet(wallet.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{wallet.name}"? This action cannot be undone.
                                    {!canDeleteWallet(wallet.id) && (
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                                        This wallet cannot be deleted because it has associated transactions.
                                      </div>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDeleteWallet(wallet.id)}
                                    disabled={!canDeleteWallet(wallet.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Details */}
      {selectedWallet && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet Details</CardTitle>
          </CardHeader>
          <CardContent>{/* Add detailed wallet view here if needed */}</CardContent>
        </Card>
      )}
    </div>
  )
}
