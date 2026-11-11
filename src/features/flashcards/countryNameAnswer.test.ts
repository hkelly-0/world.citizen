import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { isCountryNameCorrect } from './countryNameAnswer'

describe('isCountryNameCorrect', () => {
  it('accepts the common name, ignoring case, accents, and surrounding spaces', () => {
    expect(isCountryNameCorrect('  turkiye ', countryFacts['TUR'])).toBe(true)
  })

  it('accepts the official name', () => {
    expect(isCountryNameCorrect('Czech Republic', countryFacts['CZE'])).toBe(true)
  })

  it('accepts hand-written alternatives', () => {
    expect(isCountryNameCorrect('Turkey', countryFacts['TUR'])).toBe(true)
    expect(isCountryNameCorrect('usa', countryFacts['USA'])).toBe(true)
  })

  it('accepts native names, common and official', () => {
    expect(isCountryNameCorrect('Italia', countryFacts['ITA'])).toBe(true)
    expect(isCountryNameCorrect('Repubblica Italiana', countryFacts['ITA'])).toBe(true)
    expect(isCountryNameCorrect('Россия', countryFacts['RUS'])).toBe(true)
  })

  it("never accepts a country's name for a different country", () => {
    const countries = Object.values(countryFacts)
    for (const country of countries) {
      const names = [country.commonName, country.officialName, ...country.nativeNames]
      for (const name of names) {
        const matches = countries.filter((other) => isCountryNameCorrect(name, other))
        expect(
          matches.map((match) => match.isoAlpha3),
          name,
        ).toEqual([country.isoAlpha3])
      }
    }
  })

  it('rejects misspellings, empty answers, and other countries', () => {
    expect(isCountryNameCorrect('Turky', countryFacts['TUR'])).toBe(false)
    expect(isCountryNameCorrect('', countryFacts['TUR'])).toBe(false)
    expect(isCountryNameCorrect('Congo', countryFacts['COD'])).toBe(false)
  })
})
