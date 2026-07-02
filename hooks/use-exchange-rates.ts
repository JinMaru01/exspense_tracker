import { useEffect, useState } from "react"
import { loadLiveRates } from "../data/currency-data"

// Loads live FX rates once on mount (cached for 6h via localStorage) and returns a
// version number that increments when new rates arrive. Include this version in the
// dependency array of any useMemo that calls convertCurrency so totals recompute
// after rates load.
export function useExchangeRates(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    loadLiveRates()
      .then((changed) => {
        if (active && changed) setVersion((v) => v + 1)
      })
      .catch(() => {
        /* keep fallback/cached rates on failure */
      })
    return () => {
      active = false
    }
  }, [])

  return version
}
