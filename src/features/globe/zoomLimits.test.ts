import { describe, expect, it } from 'vitest'
import { zoomLimitsFor } from './zoomLimits'

describe('zoomLimitsFor', () => {
  it('uses the phone minimum at the equator on a narrow map', () => {
    expect(zoomLimitsFor(0, 400)).toEqual({ minZoom: 1.3, maxZoom: 6 })
  })

  it('uses the laptop minimum at the equator on a wide map', () => {
    expect(zoomLimitsFor(0, 1200).minZoom).toBe(1.8)
  })

  it('lowers only the maximum by one level where Mercator doubles the scale (60°)', () => {
    // MapLibre's globe adjusts the minimum for latitude itself.
    const { minZoom, maxZoom } = zoomLimitsFor(60, 400)
    expect(minZoom).toBe(1.3)
    expect(maxZoom).toBeCloseTo(5)
  })

  it('is the same in both hemispheres and stops changing past 85.05°, like MapLibre', () => {
    expect(zoomLimitsFor(-45, 400)).toEqual(zoomLimitsFor(45, 400))
    expect(zoomLimitsFor(89, 400)).toEqual(zoomLimitsFor(85.06, 400))
    expect(Number.isFinite(zoomLimitsFor(90, 400).maxZoom)).toBe(true)
  })
})
