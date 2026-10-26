import { WIDE_SCREEN_MIN_PX } from './focusZoom'

// Very small countries (Vatican, Tuvalu, Nauru...) are only a few pixels wide
// on the globe, so they are nearly impossible to tap. A tap within a few pixels
// of one counts as a tap on it, even if it lands on a bigger neighbour.
// Every other shape on the map also gets a buffer, but only over the ocean: a
// tap in the sea just off a coast counts as a tap on the nearest shape.

// Countries with a total area below this win the tap buffer over the shape
// under the finger.
export const VERY_SMALL_AREA_KM2 = 1000

// How far from a shape, in screen pixels, a tap still counts as on it. Pixels
// rather than kilometres, so it feels the same at every zoom. Wide screens
// (usually a mouse, which is more precise than a finger) get a smaller buffer.
export const TAP_BUFFER_PX = 20
export const WIDE_SCREEN_TAP_BUFFER_PX = 10

// The tap buffer for a globe `mapWidthPx` wide.
export function tapBufferPxFor(mapWidthPx: number): number {
  return mapWidthPx >= WIDE_SCREEN_MIN_PX ? WIDE_SCREEN_TAP_BUFFER_PX : TAP_BUFFER_PX
}

export type ScreenPoint = { x: number; y: number }

// Decides which shape a tap picked. `exactIndex` is the shape under the
// finger (null for ocean); `nearbyIndices` are the shapes within
// `bufferPx` of it. Indices are positions in COUNTRY_SHAPES.
// A very small country wins over whatever is under the finger; if several are
// nearby, the one directly under the finger wins, otherwise the first found.
// Otherwise the shape under the finger wins. Over the ocean, the shape with the
// nearest edge wins if it is within `bufferPx`. `distanceToPx` measures
// that, and is only called for ocean taps, as it is the slow part.
export function chooseTappedIndex(
  exactIndex: number | null,
  nearbyIndices: number[],
  verySmallIndices: Set<number>,
  bufferPx: number,
  distanceToPx: (index: number) => number,
): number | null {
  if (exactIndex !== null && verySmallIndices.has(exactIndex)) return exactIndex
  const nearbyVerySmall = nearbyIndices.find((index) => verySmallIndices.has(index))
  if (nearbyVerySmall !== undefined) return nearbyVerySmall
  if (exactIndex !== null) return exactIndex

  let nearestIndex: number | null = null
  let nearestDistancePx = bufferPx
  for (const index of new Set(nearbyIndices)) {
    const distancePx = distanceToPx(index)
    if (distancePx <= nearestDistancePx) {
      nearestIndex = index
      nearestDistancePx = distancePx
    }
  }
  return nearestIndex
}

// Distance in pixels from `point` to the nearest edge of an outline, given as
// rings of screen points (each ring closed, as in GeoJSON).
export function distanceToOutlinePx(point: ScreenPoint, rings: ScreenPoint[][]): number {
  let nearestPx = Infinity
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      nearestPx = Math.min(nearestPx, distanceToSegmentPx(point, ring[i], ring[i + 1]))
    }
  }
  return nearestPx
}

// Distance in pixels from `point` to the straight line between `start` and `end`.
export function distanceToSegmentPx(
  point: ScreenPoint,
  start: ScreenPoint,
  end: ScreenPoint,
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  // How far along the segment the closest point is, from 0 (start) to 1 (end).
  const along =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
        )
  return Math.hypot(point.x - (start.x + along * dx), point.y - (start.y + along * dy))
}
