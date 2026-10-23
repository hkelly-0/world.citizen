import { fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import { addDays } from './dates'

// How well the user knows the answer to one question about one country (e.g.
// France's capital), as tracked by FSRS (the algorithm Anki uses by default):
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
export type QuestionProgress = {
  // Days until the chance of remembering the answer drops to 90%; grows with
  // each successful review.
  stability: number
  // How hard the user finds the question, from 1 (easiest) to 10.
  difficulty: number
  // How many times the question has been reviewed, and how many of those failed.
  reps: number
  lapses: number
  // FSRS's stage for the question: New, Learning, Review or Relearning.
  state: State
  // "YYYY-MM-DD" of the last review.
  lastReview: string
  // "YYYY-MM-DD"; the question is due again on or after this date.
  dueDate: string
}

// How one answer went. "close" is only given to range questions (area,
// population, IHDI) when the pick is one title away from the correct one.
export type AnswerResult = 'right' | 'close' | 'wrong'

// FSRS rates each review Again, Hard, Good or Easy. A right answer is Good, a
// close one Hard (a weak pass: due sooner than Good, and marked more
// difficult), and a wrong one Again (a fail). Easy isn't used.
export function ratingFromAnswer(result: AnswerResult): Grade {
  if (result === 'right') return Rating.Good
  if (result === 'close') return Rating.Hard
  return Rating.Again
}

const scheduler = fsrs({
  // Each review is due when the chance of remembering drops to 90%.
  request_retention: 0.9,
  // Spread intervals a little at random (e.g. 20 days becomes 19–22), so
  // countries learned together don't all come due on the same day.
  enable_fuzz: true,
  // Whole days only: no same-day learning steps.
  enable_short_term: false,
})

// FSRS works with times; the app with "YYYY-MM-DD" dates, taken as UTC midnight
// so every gap between dates is a whole number of days.
function dateToTime(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function timeToDate(time: Date): string {
  return time.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.round((dateToTime(to).getTime() - dateToTime(from).getTime()) / 86_400_000)
}

// The card ts-fsrs expects, rebuilt from the saved progress.
function toCard(progress: QuestionProgress): Card {
  return {
    due: dateToTime(progress.dueDate),
    stability: progress.stability,
    difficulty: progress.difficulty,
    // Worked out by ts-fsrs from last_review.
    elapsed_days: 0,
    scheduled_days: daysBetween(progress.lastReview, progress.dueDate),
    // Unused with whole-day scheduling.
    learning_steps: 0,
    reps: progress.reps,
    lapses: progress.lapses,
    state: progress.state,
    last_review: dateToTime(progress.lastReview),
  }
}

// A question that has never been reviewed.
function newCard(today: string): Card {
  return {
    due: dateToTime(today),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
  }
}

// A wrong answer is always due tomorrow. FSRS on its own may wait a few days
// after failing a well-learned question, but the app re-asks failed questions
// the next day. Otherwise FSRS's due date, but never the day it was answered.
function dueDateAfter(result: AnswerResult, fsrsDue: Date, today: string): string {
  if (result === 'wrong' || fsrsDue <= dateToTime(today)) return addDays(today, 1)
  return timeToDate(fsrsDue)
}

// Returns the question's progress after a review with the given result.
// `previous` is undefined for a question that has never been reviewed. A
// review before the due date counts for less, as FSRS uses the days actually
// passed since the last review.
export function reviewQuestion(
  previous: QuestionProgress | undefined,
  result: AnswerResult,
  today: string,
): QuestionProgress {
  const card = previous === undefined ? newCard(today) : toCard(previous)
  const next = scheduler.next(card, dateToTime(today), ratingFromAnswer(result)).card
  return {
    stability: next.stability,
    difficulty: next.difficulty,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    lastReview: today,
    dueDate: dueDateAfter(result, next.due, today),
  }
}

// FSRS's predicted chance, from 0 to 1, that the user would answer the
// question right on `today`. Falls as days pass since the last review.
export function recallChance(progress: QuestionProgress, today: string): number {
  return scheduler.get_retrievability(toCard(progress), dateToTime(today), false)
}
