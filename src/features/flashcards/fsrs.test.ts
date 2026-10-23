import { Rating, State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { ratingFromAnswer, recallChance, reviewQuestion, type QuestionProgress } from './fsrs'

const TODAY = '2026-01-01'

// Reviews a new question with each result in turn, each on the day it is due.
function reviewInTurn(results: ('right' | 'close' | 'wrong')[]): QuestionProgress {
  let progress: QuestionProgress | undefined
  let day = TODAY
  for (const result of results) {
    progress = reviewQuestion(progress, result, day)
    day = progress.dueDate
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
    expect(progress.dueDate > TODAY).toBe(true)
  })

  it('waits longer after each right answer', () => {
    const gaps: number[] = []
    let progress: QuestionProgress | undefined
    let day = TODAY
    for (let i = 0; i < 4; i++) {
      progress = reviewQuestion(progress, 'right', day)
      gaps.push(new Date(progress.dueDate).getTime() - new Date(day).getTime())
      day = progress.dueDate
    }
    expect(gaps[1]).toBeGreaterThan(gaps[0])
    expect(gaps[2]).toBeGreaterThan(gaps[1])
    expect(gaps[3]).toBeGreaterThan(gaps[2])
  })

  it('makes a wrong answer due tomorrow, counting it as a lapse', () => {
    const learned = reviewInTurn(['right', 'right', 'right'])
    const failed = reviewQuestion(learned, 'wrong', learned.dueDate)

    expect(failed.dueDate).toBe(addDays(learned.dueDate, 1))
    expect(failed.lapses).toBe(1)
    expect(failed.stability).toBeLessThan(learned.stability)
    expect(failed.difficulty).toBeGreaterThan(learned.difficulty)
  })

  it('treats a close answer as a weak pass: sooner than right, later than wrong', () => {
    const right = reviewInTurn(['right', 'right'])
    const close = reviewInTurn(['right', 'close'])
    const wrong = reviewInTurn(['right', 'wrong'])

    expect(close.dueDate < right.dueDate).toBe(true)
    expect(close.dueDate > wrong.dueDate).toBe(true)
    expect(close.difficulty).toBeGreaterThan(right.difficulty)
    expect(close.lapses).toBe(0)
  })

  it('gains less from a review before the due date', () => {
    const first = reviewQuestion(undefined, 'right', TODAY)
    const onTime = reviewQuestion(first, 'right', first.dueDate)
    const early = reviewQuestion(first, 'right', addDays(TODAY, 1))

    expect(early.stability).toBeLessThan(onTime.stability)
  })

  it('never makes a question due again on the day it was answered', () => {
    const first = reviewQuestion(undefined, 'right', TODAY)
    const again = reviewQuestion(first, 'wrong', TODAY)
    expect(again.dueDate).toBe(addDays(TODAY, 1))
  })
})

describe('recallChance', () => {
  it('is about 90% on the due date, and falls as days pass', () => {
    const progress = reviewInTurn(['right', 'right', 'right'])
    const onDueDate = recallChance(progress, progress.dueDate)
    const laterOn = recallChance(progress, addDays(progress.dueDate, 30))

    expect(onDueDate).toBeGreaterThan(0.85)
    expect(onDueDate).toBeLessThan(0.95)
    expect(laterOn).toBeLessThan(onDueDate)
    expect(recallChance(progress, progress.lastReview)).toBeCloseTo(1)
  })
})
