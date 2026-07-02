import type { Currency } from "../types/expense"
import { fetchExchangeRates } from "../lib/exchange-rate-api"

export const currencies: Currency[] = [
  {
    code: "KHR",
    symbol: "៛",
    name: "Cambodian Riel",
    exchangeRate: 4100, // fallback: 1 USD = 4100 KHR (used until live rates load)
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    exchangeRate: 1, // Base currency
  },
]

// Mutable rate table: "units of <code> per 1 USD". Seeded with static fallbacks,
// refreshed at runtime by loadLiveRates(). All conversions read from here so the
// whole app (dashboard, summaries, wallet totals) uses the same live rates.
const rateTable: Record<string, number> = Object.fromEntries(
  currencies.map((c) => [c.code, c.exchangeRate]),
)

const CACHE_KEY = "fx_rates"
const CACHE_TS_KEY = "fx_rates_ts"
const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

// Hydrate synchronously from the last cached rates so even the first render is close to live.
if (typeof window !== "undefined") {
  try {
    const cached = window.localStorage.getItem(CACHE_KEY)
    if (cached) Object.assign(rateTable, JSON.parse(cached))
  } catch {
    /* ignore malformed cache */
  }
}

export const getRate = (code: string): number => rateTable[code] ?? 1

// Refresh rateTable from the live API. Returns true if the table changed.
// Skips the network call when cached rates are still fresh (< TTL), unless force=true.
export async function loadLiveRates(force = false): Promise<boolean> {
  if (typeof window !== "undefined" && !force) {
    const ts = Number(window.localStorage.getItem(CACHE_TS_KEY) || 0)
    if (Date.now() - ts < TTL_MS) return false
  }
  const rates = await fetchExchangeRates("USD")
  if (!rates || typeof rates.USD !== "number") return false
  Object.assign(rateTable, rates)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(rateTable))
      window.localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
    } catch {
      /* ignore quota errors */
    }
  }
  return true
}

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
  const fromRate = getRate(fromCurrency)
  const toRate = getRate(toCurrency)

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate
  return usdAmount * toRate
}
