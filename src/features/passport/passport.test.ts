import { describe, expect, it } from 'vitest'
import { collectedCountries, COUNTRY_COUNT } from './passport'

const answered = { repetitions: 1, intervalDays: 1, easeFactor: 2.5, dueDate: '2026-01-02' }

describe('collectedCountries', () => {
  it('is empty with no progress', () => {
    expect(collectedCountries({})).toEqual([])
  })

  it('lists countries with any question answered, alphabetically', () => {
    const progress = {
      PER: { capital: answered },
      FRA: { globe: answered, area: answered },
      AUT: {},
    }
    expect(collectedCountries(progress).map((country) => country.commonName)).toEqual([
      'France',
      'Peru',
    ])
  })

  it('leaves out codes that are not one of the 195', () => {
    expect(collectedCountries({ GRL: { globe: answered } })).toEqual([])
  })
})

describe('COUNTRY_COUNT', () => {
  it('is 195', () => {
    expect(COUNTRY_COUNT).toBe(195)
  })
})
