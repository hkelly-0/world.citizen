import type { DeckProgress } from '../features/flashcards/deck'

// Flashcard progress is kept in the browser's localStorage, on this device only.
const STORAGE_KEY = 'geography-app/question-progress'

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
