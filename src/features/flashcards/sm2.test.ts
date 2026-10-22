import { describe, expect, it } from 'vitest'
import { gradeFromAnswer, reviewQuestion } from './sm2'

describe('gradeFromAnswer', () => {
  it('gives a right answer the top SM-2 grade and a wrong one the lowest', () => {
    expect(gradeFromAnswer(true)).toBe(5)
    expect(gradeFromAnswer(false)).toBe(0)
  })
})

describe('reviewQuestion', () => {
  it('asks a new question again after 1 day, then 6 days, then interval × ease factor', () => {
    const first = reviewQuestion(undefined, 4, '2026-01-01')
    expect(first).toEqual({
      repetitions: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      dueDate: '2026-01-02',
    })

    const second = reviewQuestion(first, 4, '2026-01-02')
    expect(second.intervalDays).toBe(6)
    expect(second.dueDate).toBe('2026-01-08')

    const third = reviewQuestion(second, 4, '2026-01-08')
    expect(third.intervalDays).toBe(15) // 6 × 2.5
    expect(third.repetitions).toBe(3)
  })

  it('raises the ease factor for a perfect grade', () => {
    expect(reviewQuestion(undefined, 5, '2026-01-01').easeFactor).toBeCloseTo(2.6)
  })

  it('starts the question again, due tomorrow, after a failed review', () => {
    const learned = { repetitions: 3, easeFactor: 2.5, intervalDays: 15, dueDate: '2026-01-01' }
    const failed = reviewQuestion(learned, 2, '2026-01-01')

    expect(failed.repetitions).toBe(0)
    expect(failed.intervalDays).toBe(1)
    expect(failed.dueDate).toBe('2026-01-02')
    expect(failed.easeFactor).toBeLessThan(2.5)
  })

  it('never lets the ease factor drop below 1.3', () => {
    let progress = reviewQuestion(undefined, 0, '2026-01-01')
    for (let i = 0; i < 10; i++) progress = reviewQuestion(progress, 0, '2026-01-01')
    expect(progress.easeFactor).toBe(1.3)
  })

  it('handles due dates across month and year ends', () => {
    const progress = { repetitions: 1, easeFactor: 2.5, intervalDays: 1, dueDate: '2026-12-28' }
    expect(reviewQuestion(progress, 4, '2026-12-28').dueDate).toBe('2027-01-03')
  })
})
