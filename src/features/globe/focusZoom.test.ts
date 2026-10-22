import { describe, expect, it } from 'vitest'
import { loadCountryShapes } from '../../shared/countries'
import { focusZoomFor } from './focusZoom'
import { mainLandmassWidthKm } from './mainLandmass'

const shapes = loadCountryShapes()

function focusZoomOf(isoAlpha3: string, isWideScreen = false) {
  const shape = shapes.find((country) => country.isoAlpha3 === isoAlpha3)
  if (shape === undefined) throw new Error(`No shape for ${isoAlpha3}`)
  return focusZoomFor(mainLandmassWidthKm(shape.geometry, isoAlpha3), isWideScreen)
}

describe('focusZoomFor on phones', () => {
  // Close to the hand-picked targets: Ivory Coast 3.8, India 2.4, China 2.0.
  it('goes near the hand-picked zoom levels', () => {
    expect(focusZoomOf('CIV')).toBeCloseTo(3.8, 0)
    expect(focusZoomOf('IND')).toBeCloseTo(2.4, 0)
    expect(focusZoomOf('CHN')).toBeCloseTo(2.0, 0)
  })

  it('goes to 4.1 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(focusZoomOf('STP')).toBe(4.1)
    expect(focusZoomOf('BEL')).toBe(4.1)
    expect(focusZoomFor(1, false)).toBe(4.1)
  })

  it('keeps zooming out for countries bigger than Canada, down to 1.25', () => {
    expect(focusZoomOf('RUS')).toBeLessThan(focusZoomOf('CAN'))
    expect(focusZoomOf('RUS')).toBe(1.25)
  })

  it('zooms out further the wider the country', () => {
    expect(focusZoomFor(1000, false)).toBeGreaterThan(focusZoomFor(2000, false))
    expect(focusZoomFor(2000, false)).toBeGreaterThan(focusZoomFor(4000, false))
  })
})

describe('focusZoomFor on wide screens', () => {
  // Close to the hand-picked targets: USA 2.7, China 2.6, Russia 1.7.
  it('goes near the hand-picked zoom levels', () => {
    expect(focusZoomOf('USA', true)).toBeCloseTo(2.7, 1)
    expect(focusZoomOf('CHN', true)).toBeCloseTo(2.6, 1)
    expect(focusZoomOf('RUS', true)).toBeCloseTo(1.7, 1)
  })

  it('goes to 4.3 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(focusZoomOf('STP', true)).toBe(4.3)
    expect(focusZoomFor(1, true)).toBe(4.3)
  })

  it('zooms in further than on phones', () => {
    for (const isoAlpha3 of ['STP', 'CIV', 'IND', 'CHN', 'RUS']) {
      expect(focusZoomOf(isoAlpha3, true)).toBeGreaterThan(focusZoomOf(isoAlpha3))
    }
  })
})
