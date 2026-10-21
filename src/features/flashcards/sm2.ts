import { addDays } from './dates'

// How well the user knows one country's card, as tracked by SM-2 (the
// algorithm Anki is based on): https://super-memory.com/english/ol/sm2.htm
export type CardProgress = {
  // Correct reviews in a row; reset to 0 by a failed review.
  repetitions: number
  // How quickly the interval grows; lower for cards the user finds hard.
  easeFactor: number
  intervalDays: number
  // "YYYY-MM-DD"; the card is shown again on or after this date.
  dueDate: string
}

const STARTING_EASE_FACTOR = 2.5
const MINIMUM_EASE_FACTOR = 1.3

// Each card asks 4 questions (area, population, IHDI, capital). SM-2 grades
// from 0 to 5, where 3 or more is a pass.
export function gradeFromCorrectCount(correctCount: number): number {
  if (correctCount === 4) return 5
  if (correctCount === 3) return 4
  if (correctCount === 2) return 2
  return 0
}

// Returns the card's progress after a review with the given grade (0–5).
// `previous` is undefined for a card that has never been reviewed.
export function reviewCard(
  previous: CardProgress | undefined,
  grade: number,
  today: string,
): CardProgress {
  const repetitionsBefore = previous?.repetitions ?? 0
  const easeFactorBefore = previous?.easeFactor ?? STARTING_EASE_FACTOR
  const intervalBefore = previous?.intervalDays ?? 0

  let repetitions: number
  let intervalDays: number
  if (grade >= 3) {
    // Passed: wait 1 day, then 6 days, then keep multiplying by the ease factor.
    if (repetitionsBefore === 0) intervalDays = 1
    else if (repetitionsBefore === 1) intervalDays = 6
    else intervalDays = Math.round(intervalBefore * easeFactorBefore)
    repetitions = repetitionsBefore + 1
  } else {
    // Failed: start again from the beginning, and show it again tomorrow.
    repetitions = 0
    intervalDays = 1
  }

  // The SM-2 formula: grade 5 raises the ease factor, 4 keeps it, lower grades reduce it.
  const easeFactor = Math.max(
    MINIMUM_EASE_FACTOR,
    easeFactorBefore + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
  )

  return { repetitions, easeFactor, intervalDays, dueDate: addDays(today, intervalDays) }
}
