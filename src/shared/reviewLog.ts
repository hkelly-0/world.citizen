import type { QuestionId } from '../features/flashcards/deck'
import type { AnswerResult } from '../features/flashcards/fsrs'

// Every flashcard answer, in the order given, so FSRS's settings can later be
// tuned to how the user actually remembers (tuning needs each question's full
// history). Nothing reads it yet. Kept in the browser's localStorage, on this
// device only.
export type ReviewLogEntry = {
  // ISO alpha-3 code, e.g. "FRA".
  country: string
  question: QuestionId
  // "YYYY-MM-DD"
  date: string
  result: AnswerResult
}

const STORAGE_KEY = 'geography-app/review-log'

export function loadReviewLog(): ReviewLogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? [] : (JSON.parse(saved) as ReviewLogEntry[])
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; start a new log rather than crash.
    return []
  }
}

// Forgets every logged answer. Only used by the dev menu (`DevTools.tsx`).
export function clearReviewLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked (e.g. some private browsing modes).
  }
}

// Adds an entry for each asked question of a finished card.
export function logCardReviews(
  country: string,
  questionIds: QuestionId[],
  results: Partial<Record<QuestionId, AnswerResult>>,
  date: string,
): void {
  const log = loadReviewLog()
  for (const question of questionIds) {
    // Every asked question has a result once the card is finished.
    log.push({ country, question, date, result: results[question]! })
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // If storage is unavailable or full, these answers go unlogged.
  }
}
