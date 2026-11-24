import type { Map as MapLibreMap } from 'maplibre-gl'

// On a computer, a two-finger trackpad swipe reaches the browser as wheel
// events, which MapLibre would turn into zoom. This makes a swipe move the map
// instead, like scrolling a page. A trackpad pinch (wheel events with ctrlKey
// set) and a mouse wheel still zoom, as MapLibre handles them.
//
// Browsers don't say whether a mouse or a trackpad sent a wheel event, so each
// scroll's device is guessed from its first event (isMouseWheelStart) and kept
// for the rest of that scroll, including the trackpad's coasting afterwards.

// A wheel event this long after the last one starts a new scroll.
const NEW_SCROLL_GAP_MS = 300

// Chrome and Safari on a Mac move a mouse wheel's deltaY by whole multiples of
// this (the same value MapLibre's own mouse-or-trackpad guess uses).
const MAC_WHEEL_NOTCH = 4.000244140625

// Windows mouse wheels move about 100 pixels a notch, while a trackpad swipe
// starts with small movements.
const MOUSE_START_MIN_PX = 50

// Whether the first event of a scroll looks like it came from a mouse wheel
// rather than a trackpad.
export function isMouseWheelStart(event: WheelEvent): boolean {
  // Firefox scrolls a mouse wheel by lines; trackpads always scroll by pixels.
  if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true
  // Most mouse wheels only scroll up and down.
  if (event.deltaX !== 0) return false
  if (event.deltaY !== 0 && event.deltaY % MAC_WHEEL_NOTCH === 0) return true
  return Math.abs(event.deltaY) >= MOUSE_START_MIN_PX
}

// Makes two-finger trackpad swipes on the map's container move the map.
export function panOnTrackpadSwipe(map: MapLibreMap) {
  let lastWheelTime = 0
  let isMouseScroll = false

  // Capture: runs before MapLibre's own wheel handling, so it can stop a swipe
  // reaching it.
  map.getContainer().addEventListener(
    'wheel',
    (event) => {
      // A trackpad pinch, which MapLibre zooms.
      if (event.ctrlKey) return

      const now = performance.now()
      if (now - lastWheelTime > NEW_SCROLL_GAP_MS) isMouseScroll = isMouseWheelStart(event)
      lastWheelTime = now
      if (isMouseScroll) return

      event.preventDefault()
      event.stopPropagation()
      // Screens that freeze the map turn off scroll zoom, which stops swiping too.
      if (!map.scrollZoom.isEnabled()) return
      // Moves the map's contents the same way a page scrolls.
      map.panBy([event.deltaX, event.deltaY], { duration: 0 })
    },
    { capture: true, passive: false },
  )
}
