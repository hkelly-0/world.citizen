import type { QuestionId } from '../features/flashcards/deck'

// A flashcard being played: which country, how it was set up, and how far it
// got. Classic saves its card whenever it changes, so leaving and coming back
// the same day resumes it (`FlashcardsView`). The answers themselves are
// already in the progress and review log, saved as each one is given. Kept in
// the browser's localStorage, on this device only.
export type UnfinishedCard = {
  // "YYYY-MM-DD": the day the card was first shown. Only resumed on that day.
  date: string
  // ISO alpha-3 code, e.g. "FRA".
  country: string
  // Whether the country had no question answered when the card was first
  // shown, so its reward is the Passport count going up.
  isNewCountry: boolean
  // Whether the globe question names the country (true) or finds it (false).
  isNameQuestion: boolean
  // The ISO alpha-3 codes of the flags offered in the flag question, in the
  // order shown.
  offeredFlags: string[]
  // The questions answered so far on this card.
  answeredIds: QuestionId[]
}

const STORAGE_KEY = 'geography-app/unfinished-card'

// Null when nothing is saved.
export function loadUnfinishedCard(): UnfinishedCard | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? null : (JSON.parse(saved) as UnfinishedCard)
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; start a new card rather than crash.
    return null
  }
}

export function saveUnfinishedCard(card: UnfinishedCard): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(card))
  } catch {
    // If storage is unavailable, the card can't be resumed after leaving.
  }
}

// Used when Classic has no card to show, and by saving an edited Passport.
export function clearUnfinishedCard(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing was saved if storage is unavailable.
  }
}
