// How the Passport is sorted: A–Z by common name, in the order the countries
// were discovered (first one at the top), or by recall chance in 30 days
// (least likely to be remembered at the top). The
// last choice is kept in the browser's localStorage, on this device only.
export type PassportSort = 'alphabetical' | 'date-discovered' | 'recall'
const PASSPORT_SORTS: PassportSort[] = ['alphabetical', 'date-discovered', 'recall']

const STORAGE_KEY = 'geography-app/passport-sort'

// Alphabetical until the user picks another sort.
export function loadPassportSort(): PassportSort {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as PassportSort
    return PASSPORT_SORTS.includes(saved) ? saved : 'alphabetical'
  } catch {
    // Storage can be blocked (e.g. some private browsing modes).
    return 'alphabetical'
  }
}

export function savePassportSort(sort: PassportSort): void {
  try {
    localStorage.setItem(STORAGE_KEY, sort)
  } catch {
    // If storage is unavailable, the choice lasts only until the page closes.
  }
}
