import type { Wallet, Category } from "../types/expense"

export const defaultWallets: Wallet[] = []

export const defaultCategories: Category[] = [
  { id: "1", name: "Food & Dining", color: "#ef4444", icon: "🍽️" },
  { id: "2", name: "Transportation", color: "#3b82f6", icon: "🚗" },
  { id: "3", name: "Shopping", color: "#8b5cf6", icon: "🛍️" },
  { id: "4", name: "Groceries", color: "#f97316", icon: "🥦" },
  { id: "5", name: "Entertainment", color: "#f59e0b", icon: "🎬" },
  { id: "6", name: "Bills & Utilities", color: "#10b981", icon: "💡" },
  { id: "7", name: "Healthcare", color: "#ec4899", icon: "🏥" },
  { id: "8", name: "Education", color: "#06b6d4", icon: "📚" },
  { id: "9", name: "Travel", color: "#84cc16", icon: "✈️" },
  { id: "10", name: "Transfer", color: "#6366f1", icon: "💸" },
  { id: "11", name: "Income/Deposit", color: "#22c55e", icon: "💰" },
  { id: "12", name: "Fees/Withdrawal", color: "#ef4444", icon: "🏧" },
]
