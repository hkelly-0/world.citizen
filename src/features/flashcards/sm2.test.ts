import { describe, expect, it } from 'vitest'
import { gradeFromCorrectCount, reviewCard } from './sm2'

describe('gradeFromCorrectCount', () => {
  it('maps the number of correct answers (out of 5) to an SM-2 grade', () => {
    expect(gradeFromCorrectCount(5)).toBe(5)
    expect(gradeFromCorrectCount(4)).toBe(4)
    expect(gradeFromCorrectCount(3)).toBe(3)
    expect(gradeFromCorrectCount(2)).toBe(2)
    expect(gradeFromCorrectCount(1)).toBe(0)
    expect(gradeFromCorrectCount(0)).toBe(0)
  })
})

describe('reviewCard', () => {
  it('shows a new card again after 1 day, then 6 days, then interval × ease factor', () => {
    const first = reviewCard(undefined, 4, '2026-01-01')
    expect(first).toEqual({
      repetitions: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      dueDate: '2026-01-02',
    })

    const second = reviewCard(first, 4, '2026-01-02')
    expect(second.intervalDays).toBe(6)
    expect(second.dueDate).toBe('2026-01-08')

    const third = reviewCard(second, 4, '2026-01-08')
    expect(third.intervalDays).toBe(15) // 6 × 2.5
    expect(third.repetitions).toBe(3)
  })

  it('raises the ease factor for a perfect grade', () => {
    expect(reviewCard(undefined, 5, '2026-01-01').easeFactor).toBeCloseTo(2.6)
  })

  it('starts the card again, due tomorrow, after a failed review', () => {
    const learned = { repetitions: 3, easeFactor: 2.5, intervalDays: 15, dueDate: '2026-01-01' }
    const failed = reviewCard(learned, 2, '2026-01-01')

    expect(failed.repetitions).toBe(0)
    expect(failed.intervalDays).toBe(1)
    expect(failed.dueDate).toBe('2026-01-02')
    expect(failed.easeFactor).toBeLessThan(2.5)
  })

  it('never lets the ease factor drop below 1.3', () => {
    let progress = reviewCard(undefined, 0, '2026-01-01')
    for (let i = 0; i < 10; i++) progress = reviewCard(progress, 0, '2026-01-01')
    expect(progress.easeFactor).toBe(1.3)
  })

  it('handles due dates across month and year ends', () => {
    const progress = { repetitions: 1, easeFactor: 2.5, intervalDays: 1, dueDate: '2026-12-28' }
    expect(reviewCard(progress, 4, '2026-12-28').dueDate).toBe('2027-01-03')
  })
})
