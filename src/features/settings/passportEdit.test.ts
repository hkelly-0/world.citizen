import { afterEach, describe, expect, it } from 'vitest'
import { loadDiscoveries, recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { loadReviewLog, logCardReviews } from '../../shared/reviewLog'
import type { DeckProgress } from '../flashcards/deck'
import { reviewQuestion } from '../flashcards/fsrs'
import { editedProgress, passportCodes, savePassport } from './passportEdit'

const TODAY = '2026-10-26'
const answered = reviewQuestion(undefined, 'wrong', '2026-10-01')

describe('passportCodes', () => {
  it('lists the countries with a question answered, A–Z by name', () => {
    const progress: DeckProgress = { PER: { globe: answered }, FRA: { flag: answered }, JPN: {} }
    expect(passportCodes(progress)).toEqual(['FRA', 'PER'])
  })
})

describe('editedProgress', () => {
  it('keeps the progress of countries still in the Passport and drops the rest', () => {
    const progress: DeckProgress = { FRA: { globe: answered }, PER: { capital: answered } }
    expect(editedProgress(progress, ['FRA'], ['globe'], TODAY)).toEqual({
      FRA: { globe: answered },
    })
  })

  it('gives added countries one right answer today for each learned question', () => {
    const result = editedProgress({}, ['FRA'], ['globe', 'capital'], TODAY)
    const right = reviewQuestion(undefined, 'right', TODAY)
    expect(result).toEqual({ FRA: { globe: right, capital: right } })
  })
})

describe('savePassport', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("saves the progress, and forgets removed countries' discovery times and logged answers", () => {
    saveProgress({ FRA: { globe: answered }, PER: { capital: answered } })
    recordDiscovery('FRA', new Date('2026-10-01T09:00:00Z'))
    recordDiscovery('PER', new Date('2026-10-01T09:00:00Z'))
    logCardReviews('FRA', ['globe'], { globe: 'wrong' }, '2026-10-01')
    logCardReviews('PER', ['capital'], { capital: 'wrong' }, '2026-10-01')

    savePassport(['FRA'], ['globe'], TODAY)

    expect(loadProgress()).toEqual({ FRA: { globe: answered } })
    expect(Object.keys(loadDiscoveries())).toEqual(['FRA'])
    expect(loadReviewLog().map((entry) => entry.country)).toEqual(['FRA'])
  })

  it('discovers added countries now, without logging their made-up answers', () => {
    savePassport(['JPN'], ['globe'], TODAY)

    expect(Object.keys(loadProgress())).toEqual(['JPN'])
    expect(Object.keys(loadDiscoveries())).toEqual(['JPN'])
    expect(loadReviewLog()).toEqual([])
  })
})
