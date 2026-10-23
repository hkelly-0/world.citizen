import { COUNTRY_GROUPS } from './countryFacts'

// The country group the user chose to learn next (its id from
// countryGroups.json). New countries come only from this group until all of
// them are in the Passport; then the user chooses another. Whether it is still
// pending is worked out from progress (`pendingGroupId` in passport.ts), so a
// finished group needs no clearing. Kept in the browser's localStorage, on
// this device only.
const STORAGE_KEY = 'geography-app/learning-group'

// Null when nothing is saved, or the saved id is not a group.
export function loadLearningGroup(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return COUNTRY_GROUPS.some((group) => group.id === saved) ? saved : null
  } catch {
    // Storage can be blocked (e.g. some private browsing modes).
    return null
  }
}

export function saveLearningGroup(groupId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, groupId)
  } catch {
    // If storage is unavailable, the choice lasts only until the page closes.
  }
}

// Used by the dev menu's reset.
export function clearLearningGroup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing was saved if storage is unavailable.
  }
}
