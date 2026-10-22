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

// The zoom for the country's width as if it were at the equator, which is
// what the hand-picked targets are for.
function equatorFocusZoomOf(isoAlpha3: string, isWideScreen = false) {
  const shape = shapeOf(isoAlpha3)
  return focusZoomFor(mainLandmassWidthKm(shape.geometry, isoAlpha3), isWideScreen, 0)
}

// The zoom the globe actually goes to, at the country's own latitude.
function focusZoomOf(isoAlpha3: string, isWideScreen = false) {
  const shape = shapeOf(isoAlpha3)
  const [, latitude] = mainLandmassCentre(shape.geometry, isoAlpha3)
  return focusZoomFor(mainLandmassWidthKm(shape.geometry, isoAlpha3), isWideScreen, latitude)
}

describe('focusZoomFor on phones', () => {
  // Close to the hand-picked targets: Ivory Coast 3.8, India 2.4, China 2.0.
  it('goes near the hand-picked zoom levels', () => {
    expect(equatorFocusZoomOf('CIV')).toBeCloseTo(3.8, 0)
    expect(equatorFocusZoomOf('IND')).toBeCloseTo(2.4, 0)
    expect(equatorFocusZoomOf('CHN')).toBeCloseTo(2.0, 0)
  })

  it('goes to 4.1 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(equatorFocusZoomOf('STP')).toBe(4.1)
    expect(equatorFocusZoomOf('BEL')).toBe(4.1)
    expect(focusZoomFor(1, false, 0)).toBe(4.1)
  })

  it('keeps zooming out for countries bigger than Canada, down to 1.25', () => {
    expect(equatorFocusZoomOf('RUS')).toBeLessThan(equatorFocusZoomOf('CAN'))
    expect(equatorFocusZoomOf('RUS')).toBe(1.25)
  })

  it('zooms out further the wider the country', () => {
    expect(focusZoomFor(1000, false, 0)).toBeGreaterThan(focusZoomFor(2000, false, 0))
    expect(focusZoomFor(2000, false, 0)).toBeGreaterThan(focusZoomFor(4000, false, 0))
  })
})

describe('focusZoomFor away from the equator', () => {
  it("zooms out by MapLibre's latitude stretch, in either hemisphere", () => {
    expect(focusZoomFor(3000, false, 60)).toBeCloseTo(focusZoomFor(3000, false, 0) - 1)
    expect(focusZoomFor(3000, false, -60)).toBe(focusZoomFor(3000, false, 60))
  })

  it('draws a country the same size as one of the same width at the equator', () => {
    for (const isoAlpha3 of ['CHN', 'CAN', 'RUS', 'GRL', 'ATA']) {
      const [, latitude] = mainLandmassCentre(shapeOf(isoAlpha3).geometry, isoAlpha3)
      expect(focusZoomOf(isoAlpha3) + latitudeZoomOut(latitude)).toBeCloseTo(
        equatorFocusZoomOf(isoAlpha3),
      )
    }
  })

  it('stays finite at the poles', () => {
    expect(Number.isFinite(focusZoomFor(1, false, 90))).toBe(true)
  })
})

describe('focusZoomFor on wide screens', () => {
  // Close to the hand-picked targets: USA 2.7, China 2.6, Russia 1.7.
  it('goes near the hand-picked zoom levels', () => {
    expect(equatorFocusZoomOf('USA', true)).toBeCloseTo(2.7, 1)
    expect(equatorFocusZoomOf('CHN', true)).toBeCloseTo(2.6, 1)
    expect(equatorFocusZoomOf('RUS', true)).toBeCloseTo(1.7, 1)
  })

  it('goes to 4.3 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(equatorFocusZoomOf('STP', true)).toBe(4.3)
    expect(focusZoomFor(1, true, 0)).toBe(4.3)
  })

  it('zooms in further than on phones', () => {
    for (const isoAlpha3 of ['STP', 'CIV', 'IND', 'CHN', 'RUS']) {
      expect(focusZoomOf(isoAlpha3, true)).toBeGreaterThan(focusZoomOf(isoAlpha3))
    }
  })
})
