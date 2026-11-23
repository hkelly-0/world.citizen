import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { isCapitalCorrect, matchedCapital } from './capitalAnswer'

describe('isCapitalCorrect', () => {
  it('accepts an exact match', () => {
    expect(isCapitalCorrect('Paris', countryFacts['FRA'])).toBe(true)
  })

  it('ignores case, accents, and spaces at either end', () => {
    expect(isCapitalCorrect('  bogota ', countryFacts['COL'])).toBe(true)
    expect(isCapitalCorrect('REYKJAVÍK', countryFacts['ISL'])).toBe(true)
  })

  it('accepts a few typos', () => {
    expect(isCapitalCorrect('Pari', countryFacts['FRA'])).toBe(true)
    expect(isCapitalCorrect('Sanaa', countryFacts['YEM'])).toBe(true)
    expect(isCapitalCorrect('Ouagadougu', countryFacts['BFA'])).toBe(true)
    expect(isCapitalCorrect('Kuala Lumpar', countryFacts['MYS'])).toBe(true)
  })

  it('rejects too many typos', () => {
    expect(isCapitalCorrect('Prs', countryFacts['FRA'])).toBe(false)
    expect(isCapitalCorrect('Wagadugu', countryFacts['BFA'])).toBe(false)
  })

  it("never accepts another country's capital, however close", () => {
    // Bern is the capital of Switzerland, one letter from Berlin with a short name.
    expect(isCapitalCorrect('Bern', countryFacts['DEU'])).toBe(false)
    expect(isCapitalCorrect('Berlin', countryFacts['CHE'])).toBe(false)
  })

  it('gives the capital a typo was of', () => {
    expect(matchedCapital('ouagadougu', countryFacts['BFA'])).toBe('Ouagadougou')
    expect(matchedCapital('Rome', countryFacts['FRA'])).toBeNull()
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
