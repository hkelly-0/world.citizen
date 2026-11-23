import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { countryNameMatch, isCountryNameCorrect } from './countryNameAnswer'

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

  it('accepts a few typos', () => {
    expect(isCountryNameCorrect('Turky', countryFacts['TUR'])).toBe(true)
    expect(isCountryNameCorrect('Australa', countryFacts['AUS'])).toBe(true)
    expect(isCountryNameCorrect('Kazakstan', countryFacts['KAZ'])).toBe(true)
    expect(isCountryNameCorrect('Liechtenstien', countryFacts['LIE'])).toBe(true)
  })

  it('rejects too many typos, empty answers, and other countries', () => {
    expect(isCountryNameCorrect('Trky', countryFacts['TUR'])).toBe(false)
    expect(isCountryNameCorrect('', countryFacts['TUR'])).toBe(false)
    expect(isCountryNameCorrect('Congo', countryFacts['COD'])).toBe(false)
  })

  it("never accepts a country one typo from another's name for that other country", () => {
    expect(isCountryNameCorrect('Iraq', countryFacts['IRN'])).toBe(false)
    expect(isCountryNameCorrect('Niger', countryFacts['NGA'])).toBe(false)
    expect(isCountryNameCorrect('Nigeria', countryFacts['NER'])).toBe(false)
    expect(isCountryNameCorrect('Mali', countryFacts['MLT'])).toBe(false)
    expect(isCountryNameCorrect('Malta', countryFacts['MLI'])).toBe(false)
    expect(isCountryNameCorrect('Austria', countryFacts['AUS'])).toBe(false)
    expect(isCountryNameCorrect('Guyana', countryFacts['GIN'])).toBe(false)
    expect(isCountryNameCorrect('Guinea', countryFacts['GUY'])).toBe(false)
  })

  it('rejects a typo as close to two countries', () => {
    // One letter from both Niger and Nigeria, and from both Australia and Austria.
    expect(countryNameMatch('Nigera')).toBeNull()
    expect(countryNameMatch('Austrlia')).toBeNull()
  })
})

describe('countryNameMatch', () => {
  it('gives the accepted name a typo was of', () => {
    expect(countryNameMatch('turky')).toEqual({ key: 'TUR', name: 'Turkey' })
  })
})
