import { describe, expect, it } from 'vitest'
import { chooseNextCountry, countryDueDate, type CountryProgress } from './deck'
import type { QuestionProgress } from './sm2'

const TODAY = '2026-05-10'

function dueOn(dueDate: string): QuestionProgress {
  return { repetitions: 1, easeFactor: 2.5, intervalDays: 1, dueDate }
}

// A country whose questions are all due on the same date.
function allDueOn(dueDate: string): CountryProgress {
  return {
    globe: dueOn(dueDate),
    area: dueOn(dueDate),
    population: dueOn(dueDate),
    ihdi: dueOn(dueDate),
    capital: dueOn(dueDate),
  }
}

describe('countryDueDate', () => {
  it("is the earliest due date of the country's questions", () => {
    const progress = { globe: dueOn('2026-06-01'), capital: dueOn('2026-05-12'), area: dueOn('2026-05-20') }
    expect(countryDueDate(progress)).toBe('2026-05-12')
  })

  it('is null when none of the questions has been answered', () => {
    expect(countryDueDate(undefined)).toBeNull()
    expect(countryDueDate({})).toBeNull()
  })
})

describe('chooseNextCountry', () => {
  it('shows the most overdue review first', () => {
    const progress = {
      FRA: allDueOn('2026-05-09'),
      PER: allDueOn('2026-05-01'),
      JPN: allDueOn(TODAY),
    }
    expect(chooseNextCountry(['FRA', 'PER', 'JPN', 'IND'], progress, TODAY)).toBe('PER')
  })

  it('shows a country when only one of its questions is due', () => {
    const progress = {
      FRA: { ...allDueOn('2026-06-01'), capital: dueOn('2026-05-09') },
      PER: allDueOn('2026-05-11'),
    }
    expect(chooseNextCountry(['FRA', 'PER'], progress, TODAY)).toBe('FRA')
  })

  it('shows a random unseen country once no reviews are due', () => {
    const progress = { FRA: allDueOn('2026-05-11') }
    const codes = ['FRA', 'PER', 'JPN']
    // Unseen countries are PER and JPN; a random value of 0.9 picks the second.
    expect(chooseNextCountry(codes, progress, TODAY, () => 0.9)).toBe('JPN')
    expect(chooseNextCountry(codes, progress, TODAY, () => 0)).toBe('PER')
  })

  it('returns null when every country is seen and none are due', () => {
    const progress = { FRA: allDueOn('2026-05-11'), PER: allDueOn('2026-06-01') }
    expect(chooseNextCountry(['FRA', 'PER'], progress, TODAY)).toBeNull()
  })
})
