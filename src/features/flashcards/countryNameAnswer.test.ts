import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { isCountryNameCorrect } from './countryNameAnswer'

describe('isCountryNameCorrect', () => {
  it('accepts the common name, ignoring case, accents and surrounding spaces', () => {
    expect(isCountryNameCorrect('  turkiye ', countryFacts['TUR'])).toBe(true)
  })

  it('accepts the official name', () => {
    expect(isCountryNameCorrect('Czech Republic', countryFacts['CZE'])).toBe(true)
  })

  it('accepts hand-written alternatives', () => {
    expect(isCountryNameCorrect('Turkey', countryFacts['TUR'])).toBe(true)
    expect(isCountryNameCorrect('usa', countryFacts['USA'])).toBe(true)
  })

  it('rejects misspellings, empty answers and other countries', () => {
    expect(isCountryNameCorrect('Turky', countryFacts['TUR'])).toBe(false)
    expect(isCountryNameCorrect('', countryFacts['TUR'])).toBe(false)
    expect(isCountryNameCorrect('Congo', countryFacts['COD'])).toBe(false)
  })
})
