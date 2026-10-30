// The boxes ticked when Custom Practice last started (`CustomPracticeMenu`),
// so its menu opens with them ticked again. Kept as the menu's choice names
// (e.g. "locate", "flag", "borders", "flag-matching"); the menu ignores any it
// no longer offers. Kept in the browser's localStorage, on this device only.
const STORAGE_KEY = 'geography-app/custom-practice-choices'

// Empty when nothing is saved.
export function loadCustomPracticeChoices(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === null ? [] : (JSON.parse(saved) as string[])
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; start with nothing ticked rather than crash.
    return []
  }
}

export function saveCustomPracticeChoices(choices: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices))
  } catch {
    // If storage is unavailable, the menu opens unticked next time.
  }
}
