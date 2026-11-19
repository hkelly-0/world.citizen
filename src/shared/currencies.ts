import currenciesJson from '../data/currencies.json'
import { formatLargeNumber } from './statRanges'

// A currency incomes can be shown in, chosen in Settings. From
// scripts/make-currencies.mjs.
export type Currency = {
  // ISO 4217, e.g. "CAD". Saved, so never rename.
  code: string
  // e.g. "Canadian dollar"
  name: string
  // In English, e.g. "CA$", "€", or the code itself ("NGN").
  symbol: string
  // Local currency per PPP dollar: what a PPP dollar buys, priced in the
  // currency's own country.
  pppFactor: number
}

// Sorted by name.
export const CURRENCIES: Currency[] = currenciesJson.currencies

// The default currency for each region code (ISO alpha-2, e.g. "CA").
const DEFAULT_BY_REGION: Record<string, string> = currenciesJson.defaultByRegion

// For regions with no currency in the list (e.g. Taiwan), or an unreadable
// locale.
const FALLBACK_CURRENCY_CODE = 'USD'

export function currencyByCode(code: string): Currency | undefined {
  return CURRENCIES.find((currency) => currency.code === code)
}

// The currency of the region in a locale, e.g. "en-CA" -> "CAD". A locale with
// no region is given its likeliest one ("en" -> US, "fr" -> France).
export function defaultCurrencyCode(locale: string): string {
  try {
    const region = new Intl.Locale(locale).maximize().region
    return (region && DEFAULT_BY_REGION[region]) ?? FALLBACK_CURRENCY_CODE
  } catch {
    // Not a valid locale.
    return FALLBACK_CURRENCY_CODE
  }
}

// A yearly income in PPP dollars, in the given currency, e.g. "70K CA$/yr".
export function formatIncome(dollars: number, currency: Currency): string {
  return `${formatLargeNumber(dollars * currency.pppFactor)} ${currency.symbol}/yr`
}
