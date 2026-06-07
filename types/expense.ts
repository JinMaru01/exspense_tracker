export interface Expense {
  id: string
  amount: number
  category: string
  wallet: string
  description: string
  date: Date
  currency: string
  type: "expense" | "income" | "transfer"
  toWallet?: string       // destination wallet name, for transfer type only
  convertedAmount?: number // converted amount received by toWallet, for transfer type only
}

export interface Wallet {
  id: string
  name: string
  balance: number
  currency: string // Add currency field
  type: string
  exchangeRate?: number
  locked?: boolean
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Subscription {
  id: string
  name: string
  amount: number
  currency: string
  wallet: string
  category: string
  cycle: "weekly" | "monthly" | "yearly"
  nextDate: Date
  active: boolean
  description?: string
}

export interface Currency {
  code: string
  symbol: string
  name: string
  exchangeRate: number // Rate to USD
}
