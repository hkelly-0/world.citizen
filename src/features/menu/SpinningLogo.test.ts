import { describe, expect, it } from 'vitest'
import { swipeSpeed } from './SpinningLogo'

describe('swipeSpeed', () => {
  it('is the speed over the last moments of the drag', () => {
    const samples = [
      { time: 0, facingLongitude: 0 },
      { time: 950, facingLongitude: 0 },
      { time: 1000, facingLongitude: 10 },
    ]
    // 10 degrees in the 50ms from the first recent sample to the release.
    expect(swipeSpeed(samples, 1000)).toBe(200)
  })

  it('counts a pause before lifting as stillness', () => {
    const samples = [
      { time: 900, facingLongitude: 0 },
      { time: 920, facingLongitude: 10 },
    ]
    // 10 degrees over the 100ms up to the release, not the 20ms of moving.
    expect(swipeSpeed(samples, 1000)).toBe(100)
  })

  it('is zero when the finger rested for the whole window', () => {
    const samples = [
      { time: 0, facingLongitude: 0 },
      { time: 500, facingLongitude: 10 },
    ]
    expect(swipeSpeed(samples, 1000)).toBe(0)
  })

  it('is capped for very fast swipes', () => {
    const samples = [
      { time: 990, facingLongitude: 0 },
      { time: 1000, facingLongitude: -100 },
    ]
    expect(swipeSpeed(samples, 1000)).toBe(-720)
  })
})
