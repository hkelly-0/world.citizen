// Every round of Name every country played after Go, for the scoreboard on
// its menu of areas: those won, given up, or left midway with "Exit?". Every
// round is kept. They aren't the flashcards' progress, and nothing else reads
// them. Kept in the browser's localStorage, on this device only.
export type NamingScore = {
  // The NamingArea's id, e.g. "europe".
  areaId: string
  // When the round ended, in milliseconds since 1970 (Date.now()).
  endedAt: number
  namedCount: number
  countryCount: number
  // The stopwatch's final time, or null if it wasn't shown (a hyphen on the
  // scoreboard).
  elapsedMs: number | null
}

const STORAGE_KEY = 'geography-app/naming-scores'

// Oldest first, as they were saved. Empty if nothing is saved.
function loadAllNamingScores(): NamingScore[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? [] : (JSON.parse(saved) as NamingScore[])
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; show no scores rather than crash.
    return []
  }
}

// The area's rounds, most recent first.
export function loadNamingScores(areaId: string): NamingScore[] {
  return loadAllNamingScores()
    .filter((score) => score.areaId === areaId)
    .sort((a, b) => b.endedAt - a.endedAt)
}

export function saveNamingScore(score: NamingScore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...loadAllNamingScores(), score]))
  } catch {
    // If storage is unavailable, the round just isn't on the scoreboard.
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The day a round ended, in the device's time zone, e.g. "22 Nov 2026".
export function formatScoreDate(endedAt: number): string {
  const date = new Date(endedAt)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
