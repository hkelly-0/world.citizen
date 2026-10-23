import { describe, expect, it } from 'vitest'
import { QUESTION_IDS } from '../flashcards/deck'
import {
  collectedCountries,
  countryEase,
  COUNTRY_COUNT,
  sortedCollectedCountries,
} from './passport'

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

describe('sortedCollectedCountries', () => {
  const progress = {
    PER: { capital: answered },
    FRA: { globe: answered },
    JPN: { area: answered },
    BRA: { area: answered },
    CHL: { area: answered },
  }
  const discoveries = {
    PER: '2026-10-20T09:00:00.000Z',
    FRA: '2026-10-22T08:00:00.000Z',
    JPN: '2026-10-20T08:00:00.000Z',
  }
  const names = (sort: 'alphabetical' | 'date-discovered') =>
    sortedCollectedCountries(progress, discoveries, QUESTION_IDS, sort).map(
      (country) => country.commonName,
    )

  it('sorts alphabetically', () => {
    expect(names('alphabetical')).toEqual(['Brazil', 'Chile', 'France', 'Japan', 'Peru'])
  })

  it('sorts by date discovered, first discovered first, with undated countries before, A-Z', () => {
    expect(names('date-discovered')).toEqual(['Brazil', 'Chile', 'Japan', 'Peru', 'France'])
  })
})

describe('countryEase', () => {
  const withEase = (easeFactor: number) => ({ ...answered, easeFactor })

  it('averages the ease factors of the answered questions given', () => {
    const country = { globe: withEase(2.0), area: withEase(3.0), capital: withEase(1.3) }
    expect(countryEase(country, ['globe', 'area', 'population'])).toBe(2.5)
  })

  it('is null when none of the questions given has been answered', () => {
    expect(countryEase({ capital: withEase(2.0) }, ['globe'])).toBeNull()
    expect(countryEase(undefined, QUESTION_IDS)).toBeNull()
  })
})

describe('sorting by ease', () => {
  const withEase = (easeFactor: number) => ({ ...answered, easeFactor })
  const progress = {
    PER: { globe: withEase(2.6) },
    FRA: { globe: withEase(1.3), area: withEase(2.5) },
    JPN: { globe: withEase(1.9) },
    BRA: { globe: withEase(2.6) },
    CHL: { capital: withEase(1.3) },
  }

  it('puts the hardest first, ties A-Z, and countries with no learned question answered last', () => {
    const names = sortedCollectedCountries(progress, {}, ['globe', 'area'], 'ease').map(
      (country) => country.commonName,
    )
    expect(names).toEqual(['France', 'Japan', 'Brazil', 'Peru', 'Chile'])
  })
})

describe('COUNTRY_COUNT', () => {
  it('is 195', () => {
    expect(COUNTRY_COUNT).toBe(195)
  })
})
