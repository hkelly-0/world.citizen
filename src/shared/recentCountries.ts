// The countries whose flashcards were played today, for choosing the next
// card (`FlashcardsView`): a country can't come again until RECENT_COUNTRY_GAP
// other countries have been played since, and the first Classic card of the
// day is a new country. Every single-country card counts (Classic, Custom
// Practice, the Passport's cards, and the tutorial's home card), from its first
// answer; multi-country questions don't. Only kept for one day, so the next
// day anything can come. Kept in the browser's localStorage, on this device
// only.
type RecentCountries = {
  // "YYYY-MM-DD": the day they were played on. Only used on that day.
  date: string
  // ISO alpha-3 codes, oldest first, each at most once and at most
  // RECENT_COUNTRY_GAP of them.
  codes: string[]
  // Whether a Classic card has been answered today.
  isClassicPlayed: boolean
}

// How many other countries must be played before a country can come again.
export const RECENT_COUNTRY_GAP = 10

const STORAGE_KEY = 'geography-app/recent-countries'

// Empty when nothing is saved for `today`.
function loadRecentCountries(today: string): RecentCountries {
  const empty: RecentCountries = { date: today, codes: [], isClassicPlayed: false }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return empty
    const recent = JSON.parse(saved) as RecentCountries
    return recent.date === today ? recent : empty
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; start the day's list again rather than crash.
    return empty
  }
}

// The countries that can't come next today, as ISO alpha-3 codes.
export function recentCountryCodes(today: string): string[] {
  return loadRecentCountries(today).codes
}

// Whether a Classic card has been answered today.
export function isClassicPlayedToday(today: string): boolean {
  return loadRecentCountries(today).isClassicPlayed
}

// Called at every answer on a single-country card (only the first of a card
// changes anything, as no other country comes in between). Moves `code` to the
// newest end, dropping the oldest beyond RECENT_COUNTRY_GAP.
export function recordPlayedCountry(code: string, today: string, isClassic: boolean): void {
  const recent = loadRecentCountries(today)
  const codes = [...recent.codes.filter((recentCode) => recentCode !== code), code]
  const newRecent: RecentCountries = {
    date: today,
    codes: codes.slice(-RECENT_COUNTRY_GAP),
    isClassicPlayed: recent.isClassicPlayed || isClassic,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecent))
  } catch {
    // If storage is unavailable, countries can come again sooner.
  }
}
