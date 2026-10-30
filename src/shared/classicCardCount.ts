// How many cards Classic has finished since its last multi-country question
// (or since one was due but the Passport couldn't make any). Saved like the
// unfinished card, so leaving and coming back the same day carries on the
// count (`FlashcardsView`). Kept in the browser's localStorage, on this device
// only.
type ClassicCardCount = {
  // "YYYY-MM-DD": the day it was counted on. Only carried on that day.
  date: string
  count: number
}

const STORAGE_KEY = 'geography-app/classic-card-count'

// 0 when nothing is saved for `today`.
export function loadClassicCardCount(today: string): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return 0
    const cardCount = JSON.parse(saved) as ClassicCardCount
    return cardCount.date === today ? cardCount.count : 0
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; start the count again rather than crash.
    return 0
  }
}

export function saveClassicCardCount(count: number, today: string): void {
  try {
    const cardCount: ClassicCardCount = { date: today, count }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cardCount))
  } catch {
    // If storage is unavailable, the count starts again after leaving.
  }
}
