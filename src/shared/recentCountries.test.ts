import { beforeEach, describe, expect, it } from 'vitest'
import {
  isClassicPlayedToday,
  RECENT_COUNTRY_GAP,
  recentCountryCodes,
  recordPlayedCountry,
} from './recentCountries'

const TODAY = '2026-02-01'

describe('recentCountries', () => {
  beforeEach(() => localStorage.clear())

  it('is empty when nothing has been played', () => {
    expect(recentCountryCodes(TODAY)).toEqual([])
    expect(isClassicPlayedToday(TODAY)).toBe(false)
  })

  it('keeps only the last RECENT_COUNTRY_GAP countries, oldest first', () => {
    const codes = Array.from({ length: RECENT_COUNTRY_GAP + 1 }, (_, i) => `C${i}`)
    for (const code of codes) recordPlayedCountry(code, TODAY, false)
    expect(recentCountryCodes(TODAY)).toEqual(codes.slice(1))
  })

  it('lists a country once, moved to the newest end when played again', () => {
    recordPlayedCountry('FRA', TODAY, false)
    recordPlayedCountry('DEU', TODAY, false)
    recordPlayedCountry('FRA', TODAY, false)
    expect(recentCountryCodes(TODAY)).toEqual(['DEU', 'FRA'])
  })

  it('remembers a Classic card was played, even after other screens', () => {
    recordPlayedCountry('FRA', TODAY, true)
    recordPlayedCountry('DEU', TODAY, false)
    expect(isClassicPlayedToday(TODAY)).toBe(true)
  })

  it('starts again the next day', () => {
    recordPlayedCountry('FRA', TODAY, true)
    expect(recentCountryCodes('2026-02-02')).toEqual([])
    expect(isClassicPlayedToday('2026-02-02')).toBe(false)
  })
})
