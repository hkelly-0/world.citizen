import { describe, expect, it } from 'vitest'
import { loadCountryShapes } from '../../shared/countries'
import { focusZoomFor } from './focusZoom'
import { latitudeZoomOut } from './latitudeZoom'
import { mainLandmassCentre, mainLandmassWidthKm } from './mainLandmass'

const shapes = loadCountryShapes()

function shapeOf(isoAlpha3: string) {
  const shape = shapes.find((country) => country.isoAlpha3 === isoAlpha3)
  if (shape === undefined) throw new Error(`No shape for ${isoAlpha3}`)
  return shape
}

// The zoom for the country's width as if it were at the equator.
function equatorFocusZoomOf(isoAlpha3: string, isWideScreen = false) {
  const shape = shapeOf(isoAlpha3)
  return focusZoomFor(isoAlpha3, mainLandmassWidthKm(shape.geometry, isoAlpha3), isWideScreen, 0)
}

// The zoom the globe actually goes to, at the country's own latitude.
function focusZoomOf(isoAlpha3: string, isWideScreen = false) {
  const shape = shapeOf(isoAlpha3)
  const [, latitude] = mainLandmassCentre(shape.geometry, isoAlpha3)
  return focusZoomFor(
    isoAlpha3,
    mainLandmassWidthKm(shape.geometry, isoAlpha3),
    isWideScreen,
    latitude,
  )
}

describe('focusZoomFor on phones', () => {
  it('goes near the hand-picked zoom levels it was fitted to', () => {
    expect(focusZoomOf('MCO')).toBeCloseTo(5.8, 1)
    expect(focusZoomOf('SLV')).toBeCloseTo(4.6, 1)
    expect(focusZoomOf('NIC')).toBeCloseTo(4.1, 1)
    expect(focusZoomOf('MEX')).toBeCloseTo(2.8, 1)
    for (const [isoAlpha3, zoom] of [
      ['COL', 3.2],
      ['BRA', 2.5],
      ['USA', 2.4],
    ] as const) {
      expect(Math.abs(focusZoomOf(isoAlpha3) - zoom)).toBeLessThan(0.2)
    }
  })

  it('uses the hand-picked zoom for Russia', () => {
    expect(focusZoomOf('RUS')).toBe(1.0)
  })

  it('uses the formula for Canada', () => {
    expect(focusZoomOf('CAN')).toBeCloseTo(1.45, 1)
  })

  it('goes to 3.7944 for a country 1000 km across at the equator', () => {
    expect(focusZoomFor(null, 1000, false, 0)).toBeCloseTo(3.7944)
  })

  it('zooms out further the wider the country', () => {
    for (const [narrowerKm, widerKm] of [
      [1, 10],
      [10, 300],
      [300, 2000],
      [2000, 9000],
    ]) {
      expect(focusZoomFor(null, narrowerKm, false, 0)).toBeGreaterThan(
        focusZoomFor(null, widerKm, false, 0),
      )
    }
  })

  it('stays finite for a width of zero', () => {
    expect(Number.isFinite(focusZoomFor(null, 0, false, 0))).toBe(true)
  })
})

describe('focusZoomFor away from the equator', () => {
  it("zooms out by MapLibre's latitude stretch, in either hemisphere", () => {
    expect(focusZoomFor(null, 3000, false, 60)).toBeCloseTo(focusZoomFor(null, 3000, false, 0) - 1)
    expect(focusZoomFor(null, 3000, false, -60)).toBe(focusZoomFor(null, 3000, false, 60))
  })

  it('draws a country the same size as one of the same width at the equator', () => {
    for (const isoAlpha3 of ['CHN', 'USA', 'GRL', 'ATA']) {
      const [, latitude] = mainLandmassCentre(shapeOf(isoAlpha3).geometry, isoAlpha3)
      expect(focusZoomOf(isoAlpha3) + latitudeZoomOut(latitude)).toBeCloseTo(
        equatorFocusZoomOf(isoAlpha3),
      )
    }
  })

  it('stays finite at the poles', () => {
    expect(Number.isFinite(focusZoomFor(null, 1, false, 90))).toBe(true)
  })
})

describe('focusZoomFor on wide screens', () => {
  it('goes a fixed amount closer than on phones', () => {
    for (const widthKm of [1, 300, 1000, 5000]) {
      expect(
        focusZoomFor(null, widthKm, true, 40) - focusZoomFor(null, widthKm, false, 40),
      ).toBeCloseTo(0.2)
    }
  })

  it('uses the hand-picked zooms for Russia and Canada', () => {
    expect(focusZoomOf('RUS', true)).toBe(1.45)
    expect(focusZoomOf('CAN', true)).toBe(2.0)
  })

  it('zooms in further than on phones', () => {
    for (const isoAlpha3 of ['MCO', 'SLV', 'NIC', 'COL', 'USA', 'CAN', 'RUS']) {
      expect(focusZoomOf(isoAlpha3, true)).toBeGreaterThan(focusZoomOf(isoAlpha3))
    }
  })
})
