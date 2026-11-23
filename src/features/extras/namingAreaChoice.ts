import { NAMING_AREAS } from './namingGame'

// The area last chosen in Name every country's menu of areas, so the menu
// opens on it again. Saved on every change to the list, even without Go.
// Kept in the browser's localStorage, on this device only.
const STORAGE_KEY = 'geography-app/naming-area'

// The saved area's id, or The World's if nothing (or an area no longer
// offered) is saved.
export function loadNamingAreaChoice(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (NAMING_AREAS.some((area) => area.id === saved)) return saved as string
  } catch {
    // Storage can be blocked (e.g. some private browsing modes); start on
    // The World rather than crash.
  }
  return NAMING_AREAS[0].id
}

export function saveNamingAreaChoice(areaId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, areaId)
  } catch {
    // If storage is unavailable, the menu starts on The World next time.
  }
}
