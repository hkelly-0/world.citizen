// Whether the tutorial has been finished or skipped on this device. It opens
// by itself only until this is saved, and never for someone who already has
// countries in their Passport (e.g. from before the tutorial existed). Kept in
// the browser's localStorage, on this device only.
const STORAGE_KEY = 'geography-app/has-seen-tutorial'

export function loadHasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // Storage can be blocked (e.g. some private browsing modes). Showing the
    // tutorial on every visit would be worse than never showing it.
    return true
  }
}

export function saveHasSeenTutorial(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // If storage is unavailable, there is nothing to remember it in.
  }
}
