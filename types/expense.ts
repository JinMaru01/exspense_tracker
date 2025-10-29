export interface Expense {
  id: string
  amount: number
  category: string
  wallet: string
  description: string
  date: Date
  currency: string // Add currency field
}

export interface Wallet {
  id: string
  name: string
  balance: number
  currency: string // Add currency field
  exchangeRate?: number // Optional exchange rate to USD for conversion
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Currency {
  code: string
  symbol: string
  name: string
  exchangeRate: number // Rate to USD
}
