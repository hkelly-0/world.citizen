import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { chooseNextCountry, countryDueDate, QUESTION_IDS, type CountryProgress } from './deck'
import type { QuestionProgress } from './fsrs'

const TODAY = '2026-05-10'

function dueOn(dueDate: string): QuestionProgress {
  return {
    stability: 10,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    state: State.Review,
    lastReview: '2026-05-01',
    dueDate,
  }
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
    const progress = {
      globe: dueOn('2026-06-01'),
      capital: dueOn('2026-05-12'),
      area: dueOn('2026-05-20'),
    }
    expect(countryDueDate(progress, QUESTION_IDS)).toBe('2026-05-12')
  })

  it('only counts the given questions', () => {
    const progress = {
      globe: dueOn('2026-06-01'),
      capital: dueOn('2026-05-12'),
      area: dueOn('2026-05-20'),
    }
    expect(countryDueDate(progress, ['globe', 'area'])).toBe('2026-05-20')
    expect(countryDueDate(progress, ['population'])).toBeNull()
  })

  it('is null when none of the questions has been answered', () => {
    expect(countryDueDate(undefined, QUESTION_IDS)).toBeNull()
    expect(countryDueDate({}, QUESTION_IDS)).toBeNull()
  })
})

describe('chooseNextCountry', () => {
  it('shows the most overdue review first', () => {
    const progress = {
      FRA: allDueOn('2026-05-09'),
      PER: allDueOn('2026-05-01'),
      JPN: allDueOn(TODAY),
    }
    expect(chooseNextCountry(['FRA', 'PER', 'JPN', 'IND'], progress, TODAY, QUESTION_IDS)).toBe(
      'PER',
    )
  })

  it('shows a country when only one of its questions is due', () => {
    const progress = {
      FRA: { ...allDueOn('2026-06-01'), capital: dueOn('2026-05-09') },
      PER: allDueOn('2026-05-11'),
    }
    expect(chooseNextCountry(['FRA', 'PER'], progress, TODAY, QUESTION_IDS)).toBe('FRA')
  })

  it('ignores questions not being practised', () => {
    const progress = {
      // Only FRA's capital is due, but capitals aren't being practised.
      FRA: { ...allDueOn('2026-06-01'), capital: dueOn('2026-05-09') },
      // PER has had its capital asked but not its area, so it's new for areas.
      PER: { capital: dueOn('2026-06-01') },
    }
    expect(chooseNextCountry(['FRA', 'PER'], progress, TODAY, ['area'])).toBe('PER')
  })

  it('shows a random unseen country once no reviews are due', () => {
    const progress = { FRA: allDueOn('2026-05-11') }
    const codes = ['FRA', 'PER', 'JPN']
    // Unseen countries are PER and JPN; a random value of 0.9 picks the second.
    expect(chooseNextCountry(codes, progress, TODAY, QUESTION_IDS, () => 0.9)).toBe('JPN')
    expect(chooseNextCountry(codes, progress, TODAY, QUESTION_IDS, () => 0)).toBe('PER')
  })

  it('returns null when every country is seen and none are due', () => {
    const progress = { FRA: allDueOn('2026-05-11'), PER: allDueOn('2026-06-01') }
    expect(chooseNextCountry(['FRA', 'PER'], progress, TODAY, QUESTION_IDS)).toBeNull()
  })
})
