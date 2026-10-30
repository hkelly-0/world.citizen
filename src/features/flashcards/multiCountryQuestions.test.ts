import { describe, expect, it } from 'vitest'
import { nextMultiCountryQuestion } from './multiCountryQuestions'

// Four different population and IHDI titles, and enough for Flag Matching.
const PASSPORT = ['USA', 'DEU', 'CAN', 'ISL']

describe('nextMultiCountryQuestion', () => {
  it('never repeats the previous kind when another is possible', () => {
    const previous = { id: 'flag-matching' as const, codes: PASSPORT }
    for (let i = 0; i < 10; i++) {
      const question = nextMultiCountryQuestion(
        ['flag-matching', 'population-ordering'],
        PASSPORT,
        previous,
      )
      expect(question?.id).toBe('population-ordering')
    }
  })

  it('repeats the previous kind when it is the only one possible', () => {
    const previous = { id: 'flag-matching' as const, codes: PASSPORT }
    // North Korea has no IHDI, so there are only 3 IHDI titles.
    const passport = ['PRK', 'SOM', 'DMA', 'CHN']
    expect(
      nextMultiCountryQuestion(['flag-matching', 'ihdi-ordering'], passport, previous)?.id,
    ).toBe('flag-matching')
  })

  it('is null when the Passport can make none of the kinds', () => {
    expect(nextMultiCountryQuestion(['flag-matching'], ['USA', 'DEU', 'CAN'], null)).toBeNull()
  })
  it('never starts a matching question from the previous one of its kind', () => {
    const previous = { id: 'capital-matching' as const, codes: PASSPORT }
    for (let i = 0; i < 10; i++) {
      const question = nextMultiCountryQuestion(['capital-matching'], PASSPORT, previous)
      expect(question?.codes[0]).not.toBe('USA')
    }
  })
  it('asks Borders about a country with land neighbours, not the previous one', () => {
    const previous = { id: 'borders' as const, codes: ['FRA'] }
    for (let i = 0; i < 10; i++) {
      const question = nextMultiCountryQuestion(['borders'], ['FRA', 'ISL', 'DEU'], previous)
      expect(question).toEqual({ id: 'borders', codes: ['DEU'] })
    }
  })

  it('repeats the previous Borders country when it is the only one with land neighbours', () => {
    const previous = { id: 'borders' as const, codes: ['FRA'] }
    expect(nextMultiCountryQuestion(['borders'], ['FRA', 'ISL'], previous)).toEqual({
      id: 'borders',
      codes: ['FRA'],
    })
    expect(nextMultiCountryQuestion(['borders'], ['ISL'], null)).toBeNull()
  })
})
