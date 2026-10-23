// When each country was first seen as a flashcard, for sorting the Passport.
// Kept in the browser's localStorage, on this device only, keyed by ISO
// alpha-3 code. Times are ISO strings (e.g. "2026-10-22T09:30:00.000Z"), which
// sort in time order as text. Countries first seen before this was recorded
// have no entry.
export type Discoveries = Record<string, string>

const STORAGE_KEY = 'geography-app/discovered-at'

export function loadDiscoveries(): Discoveries {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? {} : (JSON.parse(saved) as Discoveries)
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; carry on with no times rather than crash.
    return {}
  }
}

// Forgets every discovery time, when the Passport starts afresh.
export function clearDiscoveries(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked (e.g. some private browsing modes).
  }
}

// Records that the country was first seen at `when`. Does nothing if it
// already has a time.
export function recordDiscovery(isoAlpha3: string, when: Date): void {
  const discoveries = loadDiscoveries()
  if (discoveries[isoAlpha3] !== undefined) return
  discoveries[isoAlpha3] = when.toISOString()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(discoveries))
  } catch {
    // If storage is unavailable, the time is lost and the country sorts with
    // those that have none.
  }
}
