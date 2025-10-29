import type { Wallet, Category } from "../types/expense"

export const mockWallets: Wallet[] = [
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

export const mockCategories: Category[] = [
  { id: "1", name: "Food & Dining", color: "#ef4444", icon: "🍽️" },
  { id: "2", name: "Transportation", color: "#3b82f6", icon: "🚗" },
  { id: "3", name: "Shopping", color: "#8b5cf6", icon: "🛍️" },
  { id: "4", name: "Entertainment", color: "#f59e0b", icon: "🎬" },
  { id: "5", name: "Bills & Utilities", color: "#10b981", icon: "💡" },
  { id: "6", name: "Healthcare", color: "#ec4899", icon: "🏥" },
  { id: "7", name: "Education", color: "#06b6d4", icon: "📚" },
  { id: "8", name: "Travel", color: "#84cc16", icon: "✈️" },
]
