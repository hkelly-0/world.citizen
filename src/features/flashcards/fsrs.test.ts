import { Rating, State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { ratingFromAnswer, recallChance, reviewQuestion, type QuestionProgress } from './fsrs'

const TODAY = '2026-01-01'

// How many days apart reviewInTurn's reviews are.
const GAP_DAYS = 5

// Reviews a new question with each result in turn, GAP_DAYS apart, starting
// on TODAY.
function reviewInTurn(results: ('right' | 'close' | 'wrong')[]): QuestionProgress {
  let progress: QuestionProgress | undefined
  let day = TODAY
  for (const result of results) {
    progress = reviewQuestion(progress, result, day)
    day = addDays(day, GAP_DAYS)
  }
  return progress!
}

describe('ratingFromAnswer', () => {
  it('rates a right answer Good, a close one Hard, and a wrong one Again', () => {
    expect(ratingFromAnswer('right')).toBe(Rating.Good)
    expect(ratingFromAnswer('close')).toBe(Rating.Hard)
    expect(ratingFromAnswer('wrong')).toBe(Rating.Again)
  })
})

describe('reviewQuestion', () => {
  it('records a new question as reviewed today', () => {
    const progress = reviewQuestion(undefined, 'right', TODAY)
    expect(progress.reps).toBe(1)
    expect(progress.lapses).toBe(0)
    expect(progress.state).toBe(State.Review)
    expect(progress.lastReview).toBe(TODAY)
  })

  it('becomes more stable after each right answer', () => {
    const stabilities = [1, 2, 3, 4].map(
      (count) => reviewInTurn(Array(count).fill('right')).stability,
    )
    expect(stabilities[1]).toBeGreaterThan(stabilities[0])
    expect(stabilities[2]).toBeGreaterThan(stabilities[1])
    expect(stabilities[3]).toBeGreaterThan(stabilities[2])
  })

  it('counts a wrong answer as a lapse, making the question less stable', () => {
    const learned = reviewInTurn(['right', 'right', 'right'])
    const failed = reviewQuestion(learned, 'wrong', addDays(learned.lastReview, GAP_DAYS))

    expect(failed.lapses).toBe(1)
    expect(failed.stability).toBeLessThan(learned.stability)
    expect(failed.difficulty).toBeGreaterThan(learned.difficulty)
  })

  it('treats a close answer as a weak pass: less stable than right, more than wrong', () => {
    const right = reviewInTurn(['right', 'right'])
    const close = reviewInTurn(['right', 'close'])
    const wrong = reviewInTurn(['right', 'wrong'])

    expect(close.stability).toBeLessThan(right.stability)
    expect(close.stability).toBeGreaterThan(wrong.stability)
    expect(close.difficulty).toBeGreaterThan(right.difficulty)
    expect(close.lapses).toBe(0)
  })

  it('gains less from a review soon after the last one', () => {
    const first = reviewQuestion(undefined, 'right', TODAY)
    const later = reviewQuestion(first, 'right', addDays(TODAY, GAP_DAYS))
    const sooner = reviewQuestion(first, 'right', addDays(TODAY, 1))

    expect(sooner.stability).toBeLessThan(later.stability)
  })

  it('only counts the first answer of a day', () => {
    const first = reviewQuestion(undefined, 'right', TODAY)
    const latestRepeatAnswer = { date: TODAY, result: 'wrong' }
    expect(reviewQuestion(first, 'wrong', TODAY)).toEqual({ ...first, latestRepeatAnswer })
  })

  it('remembers the latest repeat answer of the day, cleared by the next review', () => {
    const first = reviewQuestion(undefined, 'right', TODAY)
    expect(first.latestRepeatAnswer).toBeUndefined()
    const second = reviewQuestion(first, 'right', TODAY)
    const third = reviewQuestion(second, 'close', TODAY)
    expect(second.latestRepeatAnswer).toEqual({ date: TODAY, result: 'right' })
    expect(third.latestRepeatAnswer).toEqual({ date: TODAY, result: 'close' })
    const nextDay = reviewQuestion(third, 'right', addDays(TODAY, 1))
    expect(nextDay.latestRepeatAnswer).toBeUndefined()
  })
})

describe('recallChance', () => {
  it('is about 100% on the day of the last review, and falls as days pass', () => {
    const progress = reviewInTurn(['right', 'right', 'right'])
    const soon = recallChance(progress, addDays(progress.lastReview, 5))
    const laterOn = recallChance(progress, addDays(progress.lastReview, 30))

    expect(recallChance(progress, progress.lastReview)).toBeCloseTo(1)
    expect(soon).toBeLessThan(1)
    expect(laterOn).toBeLessThan(soon)
  })
})
