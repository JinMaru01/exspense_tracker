import type { Currency } from "../types/expense"

export const currencies: Currency[] = [
  {
    code: "KHR",
    symbol: "៛",
    name: "Cambodian Riel",
    exchangeRate: 4100, // 1 USD = 4100 KHR (approximate)
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    exchangeRate: 1, // Base currency
  },
]

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return currencies.find((currency) => currency.code === code)
}

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode)
  if (!currency) return amount.toString()

  if (currencyCode === "KHR") {
    return `${currency.symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`
  } else {
    return `${currency.symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
}

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
  const fromRate = getCurrencyByCode(fromCurrency)?.exchangeRate || 1
  const toRate = getCurrencyByCode(toCurrency)?.exchangeRate || 1

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate
  return usdAmount * toRate
}
