import { describe, expect, it } from 'vitest'
import currenciesJson from '../data/currencies.json'
import { CURRENCIES, currencyByCode, defaultCurrencyCode, formatIncome } from './currencies'

describe('currencies', () => {
  it('has the US dollar at exactly 1, as the incomes are in PPP dollars', () => {
    expect(currencyByCode('USD')).toEqual({
      code: 'USD',
      name: 'United States dollar',
      pppFactor: 1,
    })
  })

  it('has unique codes, sorted by name', () => {
    const codes = CURRENCIES.map((currency) => currency.code)
    expect(new Set(codes).size).toBe(codes.length)
    const names = CURRENCIES.map((currency) => currency.name)
    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b)))
  })

  it('offers every default currency', () => {
    for (const code of Object.values(currenciesJson.defaultByRegion)) {
      expect(currencyByCode(code), code).toBeDefined()
    }
  })

  it("defaults to the currency of the locale's region", () => {
    expect(defaultCurrencyCode('en-CA')).toBe('CAD')
    expect(defaultCurrencyCode('en-GB')).toBe('GBP')
    expect(defaultCurrencyCode('es-EC')).toBe('USD')
    // A locale with no region is given its likeliest one.
    expect(defaultCurrencyCode('fr')).toBe('EUR')
    expect(defaultCurrencyCode('en')).toBe('USD')
  })

  it('falls back to the US dollar for regions with no currency listed, and bad locales', () => {
    // Taiwan's dollar has no PPP conversion factor.
    expect(defaultCurrencyCode('zh-TW')).toBe('USD')
    expect(defaultCurrencyCode('not a locale!')).toBe('USD')
  })

  it('converts an income with the PPP factor and shortens it', () => {
    const dollars = 50_000
    expect(formatIncome(dollars, currencyByCode('USD')!)).toBe('50K USD/yr')
    const canadianDollar = currencyByCode('CAD')!
    expect(formatIncome(dollars, canadianDollar)).toBe(
      `${Math.round((dollars * canadianDollar.pppFactor) / 1000)}K CAD/yr`,
    )
  })
})
