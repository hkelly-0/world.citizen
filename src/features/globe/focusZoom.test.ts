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
  it('goes near the hand-picked zoom levels', () => {
    expect(equatorFocusZoomOf('CIV')).toBeCloseTo(3.9, 1)
    expect(equatorFocusZoomOf('IND')).toBeCloseTo(2.6, 1)
    expect(focusZoomOf('CHN')).toBeCloseTo(1.9, 1)
  })

  it('uses the hand-picked zooms for Russia and Canada', () => {
    expect(focusZoomOf('RUS')).toBe(1.0)
    expect(focusZoomOf('CAN')).toBe(1.4)
  })

  it('goes to 4.1 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(equatorFocusZoomOf('STP')).toBe(4.1)
    expect(equatorFocusZoomOf('BEL')).toBe(4.1)
    expect(focusZoomFor(null, 1, false, 0)).toBe(4.1)
  })

  it('zooms out further the wider the country, down to 1.25', () => {
    expect(focusZoomFor(null, 1000, false, 0)).toBeGreaterThan(focusZoomFor(null, 2000, false, 0))
    expect(focusZoomFor(null, 2000, false, 0)).toBeGreaterThan(focusZoomFor(null, 4000, false, 0))
    expect(focusZoomFor(null, 10000, false, 0)).toBe(1.25)
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
  it('goes near the hand-picked zoom levels', () => {
    expect(focusZoomOf('USA', true)).toBeCloseTo(2.6, 1)
    expect(focusZoomOf('CHN', true)).toBeCloseTo(2.6, 1)
  })

  it('uses the hand-picked zooms for Russia and Canada', () => {
    expect(focusZoomOf('RUS', true)).toBe(1.45)
    expect(focusZoomOf('CAN', true)).toBe(2.2)
  })

  it('goes to 4.3 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(equatorFocusZoomOf('STP', true)).toBe(4.3)
    expect(focusZoomFor(null, 1, true, 0)).toBe(4.3)
  })

  it('zooms in further than on phones', () => {
    for (const isoAlpha3 of ['STP', 'CIV', 'IND', 'CHN', 'CAN', 'RUS']) {
      expect(focusZoomOf(isoAlpha3, true)).toBeGreaterThan(focusZoomOf(isoAlpha3))
    }
  })
})
