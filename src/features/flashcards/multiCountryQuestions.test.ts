import { describe, expect, it } from 'vitest'
import { nextMultiCountryQuestion } from './multiCountryQuestions'

// Four different population and IHDI titles, and enough for Flag Matching.
const PASSPORT = ['USA', 'DEU', 'CAN', 'ISL']

describe('nextMultiCountryQuestion', () => {
  it('never repeats the previous kind when another is possible', () => {
    const previous = { id: 'flag-matching' as const, codes: PASSPORT }
    for (let i = 0; i < 10; i++) {
      const question = nextMultiCountryQuestion(
        ['flag-matching', 'population-ranking'],
        PASSPORT,
        previous,
      )
      expect(question?.id).toBe('population-ranking')
    }
  })

  it('repeats the previous kind when it is the only one possible', () => {
    const previous = { id: 'flag-matching' as const, codes: PASSPORT }
    // North Korea has no IHDI, so there are only 3 IHDI titles.
    const passport = ['PRK', 'SOM', 'DMA', 'CHN']
    expect(
      nextMultiCountryQuestion(['flag-matching', 'ihdi-ranking'], passport, previous)?.id,
    ).toBe('flag-matching')
  })

  it('is null when the Passport can make none of the kinds', () => {
    expect(nextMultiCountryQuestion(['flag-matching'], ['USA', 'DEU', 'CAN'], null)).toBeNull()
  })
})
