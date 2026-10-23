import type { DeckProgress } from '../features/flashcards/deck'
import { clearDiscoveries } from './discoveries'

// Flashcard progress is kept in the browser's localStorage, on this device only.
const STORAGE_KEY = 'geography-app/fsrs-progress'

// Before FSRS, progress was kept here in SM-2's form.
const OLD_SM2_STORAGE_KEY = 'geography-app/question-progress'

// Deletes progress saved in SM-2's form, which isn't converted to FSRS, and the
// Passport's discovery times with it, so the Passport starts completely fresh.
// Does nothing once the SM-2 progress is gone.
export function removeOldSm2Progress(): void {
  try {
    if (localStorage.getItem(OLD_SM2_STORAGE_KEY) === null) return
    localStorage.removeItem(OLD_SM2_STORAGE_KEY)
    clearDiscoveries()
  } catch {
    // Storage can be blocked (e.g. some private browsing modes); then there is
    // nothing saved to remove.
  }
}

export function loadProgress(): DeckProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? {} : (JSON.parse(saved) as DeckProgress)
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; start with no progress rather than crash.
    return {}
  }
}

export function saveProgress(progress: DeckProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // If storage is unavailable, progress lasts only until the page closes.
  }
}
