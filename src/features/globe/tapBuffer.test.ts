import { describe, expect, it } from 'vitest'
import { chooseTappedIndex } from './tapBuffer'

const verySmall = new Set([7, 8])

describe('chooseTappedIndex', () => {
  it('picks the country under the finger when no very small country is nearby', () => {
    expect(chooseTappedIndex(3, [3, 4], verySmall)).toBe(3)
  })

  it('returns null for the ocean when no very small country is nearby', () => {
    expect(chooseTappedIndex(null, [], verySmall)).toBeNull()
  })

  it('picks a nearby very small country when tapping the ocean', () => {
    expect(chooseTappedIndex(null, [7], verySmall)).toBe(7)
  })

  it('picks a nearby very small country over the bigger country under the finger', () => {
    expect(chooseTappedIndex(3, [3, 7], verySmall)).toBe(7)
  })

  it('picks the very small country under the finger over another nearby one', () => {
    expect(chooseTappedIndex(8, [7, 8], verySmall)).toBe(8)
  })
})
