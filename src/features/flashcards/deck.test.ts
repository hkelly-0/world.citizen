import { describe, expect, it } from 'vitest'
import { chooseNextCountry } from './deck'
import type { CardProgress } from './sm2'

const TODAY = '2026-05-10'

function dueOn(dueDate: string): CardProgress {
  return { repetitions: 1, easeFactor: 2.5, intervalDays: 1, dueDate }
}

describe('chooseNextCountry', () => {
  it('shows the most overdue review first', () => {
    const progress = { FRA: dueOn('2026-05-09'), PER: dueOn('2026-05-01'), JPN: dueOn(TODAY) }
    expect(chooseNextCountry(['FRA', 'PER', 'JPN', 'IND'], progress, TODAY)).toBe('PER')
  })

  it('shows a random unseen country once no reviews are due', () => {
    const progress = { FRA: dueOn('2026-05-11') }
    const codes = ['FRA', 'PER', 'JPN']
    // Unseen countries are PER and JPN; a random value of 0.9 picks the second.
    expect(chooseNextCountry(codes, progress, TODAY, () => 0.9)).toBe('JPN')
    expect(chooseNextCountry(codes, progress, TODAY, () => 0)).toBe('PER')
  })

  it('returns null when every country is seen and none are due', () => {
    const progress = { FRA: dueOn('2026-05-11'), PER: dueOn('2026-06-01') }
    expect(chooseNextCountry(['FRA', 'PER'], progress, TODAY)).toBeNull()
  })
})
