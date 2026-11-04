import { useSyncExternalStore } from 'react'

// Whether the dev option shows the map's zoom level on the globe screen. Kept
// in memory only, so a reload turns it off. Components read it with
// useIsZoomShown, which updates them straight away, so the dev menu doesn't
// have to remount the current screen (that would lose the place on the globe).
let isZoomShown = false
const listeners = new Set<() => void>()

export function setZoomShown(shown: boolean) {
  isZoomShown = shown
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useIsZoomShown(): boolean {
  return useSyncExternalStore(subscribe, () => isZoomShown)
}
