import { describe, expect, it } from 'vitest'
import {
  chooseTappedIndex,
  distanceToOutlinePx,
  distanceToSegmentPx,
  TAP_BUFFER_PX,
  tapBufferPxFor,
  WIDE_SCREEN_TAP_BUFFER_PX,
} from './tapBuffer'
import { WIDE_SCREEN_MIN_PX } from './focusZoom'

const verySmall = new Set([7, 8])

// Distances in pixels from the tap to each shape's edge, by index.
const distances: Record<number, number> = { 3: 5, 4: 12, 5: TAP_BUFFER_PX + 1 }
const distanceToPx = (index: number) => distances[index]

describe('chooseTappedIndex', () => {
  it('picks the country under the finger when no very small country is nearby', () => {
    expect(chooseTappedIndex(3, [3, 4], verySmall, TAP_BUFFER_PX, distanceToPx)).toBe(3)
  })

  it('picks the country under the finger even when another edge is nearer', () => {
    expect(chooseTappedIndex(4, [3, 4], verySmall, TAP_BUFFER_PX, distanceToPx)).toBe(4)
  })

  it('returns null for the ocean when nothing is nearby', () => {
    expect(chooseTappedIndex(null, [], verySmall, TAP_BUFFER_PX, distanceToPx)).toBeNull()
  })

  it('picks the shape with the nearest edge when tapping the ocean', () => {
    expect(chooseTappedIndex(null, [4, 3, 4], verySmall, TAP_BUFFER_PX, distanceToPx)).toBe(3)
  })

  it('returns null for the ocean when the only nearby edge is beyond the buffer', () => {
    // The nearby query is a square, so its corners reach further than TAP_BUFFER_PX.
    expect(chooseTappedIndex(null, [5], verySmall, TAP_BUFFER_PX, distanceToPx)).toBeNull()
  })

  it('picks a nearby very small country when tapping the ocean', () => {
    expect(chooseTappedIndex(null, [3, 7], verySmall, TAP_BUFFER_PX, distanceToPx)).toBe(7)
  })

  it('picks a nearby very small country over the bigger country under the finger', () => {
    expect(chooseTappedIndex(3, [3, 7], verySmall, TAP_BUFFER_PX, distanceToPx)).toBe(7)
  })

  it('picks the very small country under the finger over another nearby one', () => {
    expect(chooseTappedIndex(8, [7, 8], verySmall, TAP_BUFFER_PX, distanceToPx)).toBe(8)
  })
})

describe('tapBufferPxFor', () => {
  it('uses the full buffer on phones', () => {
    expect(tapBufferPxFor(WIDE_SCREEN_MIN_PX - 1)).toBe(TAP_BUFFER_PX)
  })

  it('uses the smaller buffer on wide screens', () => {
    expect(tapBufferPxFor(WIDE_SCREEN_MIN_PX)).toBe(WIDE_SCREEN_TAP_BUFFER_PX)
  })
})

describe('distanceToSegmentPx', () => {
  const start = { x: 0, y: 0 }
  const end = { x: 10, y: 0 }

  it('measures straight across to the middle of the segment', () => {
    expect(distanceToSegmentPx({ x: 5, y: 3 }, start, end)).toBe(3)
  })

  it('measures to the nearer end when the point is past it', () => {
    expect(distanceToSegmentPx({ x: 13, y: 4 }, start, end)).toBe(5)
  })

  it('handles a segment of zero length', () => {
    expect(distanceToSegmentPx({ x: 3, y: 4 }, start, start)).toBe(5)
  })
})

describe('distanceToOutlinePx', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 0, y: 0 },
  ]

  it('measures to the nearest edge of any ring', () => {
    expect(distanceToOutlinePx({ x: 14, y: 5 }, [square])).toBe(4)
  })

  it('is infinite for an empty outline', () => {
    expect(distanceToOutlinePx({ x: 0, y: 0 }, [])).toBe(Infinity)
  })
})
