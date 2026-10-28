import { fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'

// How well the user knows the answer to one question about one country (e.g.
// France's capital), as tracked by FSRS (the algorithm Anki uses by default):
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
// Only FSRS's memory model is used, for familiarity: there are no due dates,
// as flashcards pick countries at random, weighted by how unfamiliar they are.
// Progress saved before due dates were removed still has a `dueDate`, which is
// ignored.
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
  // The latest answer after the review on `lastReview`, given that same day
  // (the second answer of the day or later), which FSRS doesn't count. Not part
  // of FSRS: it gives familiarity a bonus for the rest of the day
  // (`questionFamiliarity` in familiarity.ts). Missing until such an answer,
  // and cleared by the next review.
  latestRepeatAnswer?: { date: string; result: AnswerResult }
}

// How one answer went. "close" is only given to range questions (area,
// population, IHDI) when the pick is one title away from the correct one, and
// to info questions rated "Partly".
export type AnswerResult = 'right' | 'close' | 'wrong'

// FSRS rates each review Again, Hard, Good or Easy. A right answer is Good, a
// close one Hard (a weak pass: less stable than Good, and marked more
// difficult), and a wrong one Again (a fail). Easy isn't used.
export function ratingFromAnswer(result: AnswerResult): Grade {
  if (result === 'right') return Rating.Good
  if (result === 'close') return Rating.Hard
  return Rating.Again
}

const scheduler = fsrs({
  // Whole days only: no same-day learning steps.
  enable_short_term: false,
})

// FSRS works with times; the app with "YYYY-MM-DD" dates, taken as UTC midnight
// so every gap between dates is a whole number of days.
function dateToTime(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

// The card ts-fsrs expects, rebuilt from the saved progress. ts-fsrs works out
// stability and the chance of remembering from last_review alone, so the due
// date and interval, which the app doesn't use, are left at the last review.
function toCard(progress: QuestionProgress): Card {
  return {
    due: dateToTime(progress.lastReview),
    stability: progress.stability,
    difficulty: progress.difficulty,
    // Worked out by ts-fsrs from last_review.
    elapsed_days: 0,
    scheduled_days: 0,
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

// Returns the question's progress after a review with the given result.
// `previous` is undefined for a question that has never been reviewed. A
// review soon after the last one counts for less, as FSRS uses the days
// actually passed since the last review. Only the first answer of a day is an
// FSRS review: FSRS gains nothing from a right answer on the same day but
// loses from a wrong one, so extra practice on a day could only hurt. Later
// answers that day only change `latestRepeatAnswer` (they are still logged in
// reviewLog.ts).
export function reviewQuestion(
  previous: QuestionProgress | undefined,
  result: AnswerResult,
  today: string,
): QuestionProgress {
  if (previous !== undefined && previous.lastReview === today) {
    return { ...previous, latestRepeatAnswer: { date: today, result } }
  }
  const card = previous === undefined ? newCard(today) : toCard(previous)
  const next = scheduler.next(card, dateToTime(today), ratingFromAnswer(result)).card
  return {
    stability: next.stability,
    difficulty: next.difficulty,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    lastReview: today,
  }
}

// FSRS's predicted chance, from 0 to 1, that the user would answer the
// question right on `today`. Falls as days pass since the last review.
export function recallChance(progress: QuestionProgress, today: string): number {
  return scheduler.get_retrievability(toCard(progress), dateToTime(today), false)
}
