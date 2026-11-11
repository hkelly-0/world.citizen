import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { isCapitalCorrect } from './capitalAnswer'

describe('isCapitalCorrect', () => {
  it('accepts an exact match', () => {
    expect(isCapitalCorrect('Paris', countryFacts['FRA'])).toBe(true)
  })

  it('ignores case, accents, and spaces at either end', () => {
    expect(isCapitalCorrect('  bogota ', countryFacts['COL'])).toBe(true)
    expect(isCapitalCorrect('REYKJAVÍK', countryFacts['ISL'])).toBe(true)
  })

  it('rejects any other spelling difference', () => {
    expect(isCapitalCorrect('Pari', countryFacts['FRA'])).toBe(false)
    expect(isCapitalCorrect('Sanaa', countryFacts['YEM'])).toBe(false)
  })

  it('accepts any one of several capitals', () => {
    expect(isCapitalCorrect('Cape Town', countryFacts['ZAF'])).toBe(true)
    expect(isCapitalCorrect('Johannesburg', countryFacts['ZAF'])).toBe(false)
  })

  it('accepts native names', () => {
    expect(isCapitalCorrect('Warszawa', countryFacts['POL'])).toBe(true)
    expect(isCapitalCorrect('Москва', countryFacts['RUS'])).toBe(true)
    expect(isCapitalCorrect('Warszawa', countryFacts['RUS'])).toBe(false)
  })
})
