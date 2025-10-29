// Fetch real-time exchange rates from an API
export async function fetchExchangeRates(baseCurrency = "USD"): Promise<Record<string, number>> {
  try {
    // Using exchangerate-api.com free tier (no API key required for basic usage)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates")
    }

    const data = await response.json()
    return data.rates
  } catch (error) {
    console.error("[v0] Error fetching exchange rates:", error)
    // Fallback to static rates if API fails
    return {
      USD: 1,
      KHR: 4100,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.24,
    }
  }
}

export async function convertWithLiveRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<{ convertedAmount: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, rate: 1 }
  }

  const rates = await fetchExchangeRates(fromCurrency)
  const rate = rates[toCurrency] || 1
  const convertedAmount = amount * rate

  return { convertedAmount, rate }
}
