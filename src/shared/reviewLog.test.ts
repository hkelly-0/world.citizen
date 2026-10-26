import { afterEach, describe, expect, it } from 'vitest'
import { loadReviewLog, logCardReviews, removeCountriesFromReviewLog } from './reviewLog'

describe('review log', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(loadReviewLog()).toEqual([])
  })

  it("adds an entry for each asked question, after earlier cards' entries", () => {
    logCardReviews('FRA', ['globe', 'area'], { globe: 'right', area: 'close' }, '2026-01-01')
    logCardReviews('PER', ['capital'], { capital: 'wrong' }, '2026-01-02')

    expect(loadReviewLog()).toEqual([
      { country: 'FRA', question: 'globe', date: '2026-01-01', result: 'right' },
      { country: 'FRA', question: 'area', date: '2026-01-01', result: 'close' },
      { country: 'PER', question: 'capital', date: '2026-01-02', result: 'wrong' },
    ])
  })

  it('starts a new log when the saved one is unreadable', () => {
    localStorage.setItem('geography-app/review-log', 'not json')
    expect(loadReviewLog()).toEqual([])
  })

  it('forgets the answers about removed countries only', () => {
    logCardReviews('FRA', ['globe'], { globe: 'right' }, '2026-01-01')
    logCardReviews('PER', ['capital'], { capital: 'wrong' }, '2026-01-02')
    logCardReviews('FRA', ['area'], { area: 'close' }, '2026-01-03')
    removeCountriesFromReviewLog(['FRA'])

    expect(loadReviewLog()).toEqual([
      { country: 'PER', question: 'capital', date: '2026-01-02', result: 'wrong' },
    ])
  })
})
