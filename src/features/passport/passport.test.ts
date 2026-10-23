import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { QUESTION_IDS } from '../flashcards/deck'
import { recallChance } from '../flashcards/fsrs'
import {
  collectedCountries,
  countryRecall,
  COUNTRY_COUNT,
  sortedCollectedCountries,
} from './passport'

const answered = { stability: 10, difficulty: 5, reps: 1, lapses: 0, state: State.Review, lastReview: '2026-01-01', dueDate: '2026-01-11' }
const TODAY = '2026-02-01'

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
    sortedCollectedCountries(progress, discoveries, QUESTION_IDS, sort, TODAY).map(
      (country) => country.commonName,
    )

  it('sorts alphabetically', () => {
    expect(names('alphabetical')).toEqual(['Brazil', 'Chile', 'France', 'Japan', 'Peru'])
  })

  it('sorts by date discovered, first discovered first, with undated countries before, A-Z', () => {
    expect(names('date-discovered')).toEqual(['Brazil', 'Chile', 'Japan', 'Peru', 'France'])
  })
})

describe('countryRecall', () => {
  // A higher stability is remembered for longer, so has a higher recall chance.
  const withStability = (stability: number) => ({ ...answered, stability })

  it('averages the recall chances of the answered questions given', () => {
    const country = { globe: withStability(5), area: withStability(50), capital: withStability(1) }
    const expected = (recallChance(country.globe, TODAY) + recallChance(country.area, TODAY)) / 2
    expect(countryRecall(country, ['globe', 'area', 'population'], TODAY)).toBeCloseTo(expected)
  })

  it('is null when none of the questions given has been answered', () => {
    expect(countryRecall({ capital: withStability(5) }, ['globe'], TODAY)).toBeNull()
    expect(countryRecall(undefined, QUESTION_IDS, TODAY)).toBeNull()
  })
})

describe('sorting by recall', () => {
  const withStability = (stability: number) => ({ ...answered, stability })
  const progress = {
    PER: { globe: withStability(50) },
    FRA: { globe: withStability(1), area: withStability(20) },
    JPN: { globe: withStability(10) },
    BRA: { globe: withStability(50) },
    CHL: { capital: withStability(1) },
  }

  it('puts the least likely to be remembered first, ties A-Z, and countries with no learned question answered last', () => {
    const names = sortedCollectedCountries(progress, {}, ['globe', 'area'], 'recall', TODAY).map(
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
