import { describe, expect, it } from 'vitest'
import { loadCountryShapes } from '../../shared/countries'
import { focusZoomFor } from './focusZoom'
import { mainLandmassWidthKm } from './mainLandmass'

const shapes = loadCountryShapes()

function focusZoomOf(isoAlpha3: string) {
  const shape = shapes.find((country) => country.isoAlpha3 === isoAlpha3)
  if (shape === undefined) throw new Error(`No shape for ${isoAlpha3}`)
  return focusZoomFor(mainLandmassWidthKm(shape.geometry, isoAlpha3))
}

describe('focusZoomFor', () => {
  // Close to the hand-picked targets: Ivory Coast 3.8, India 2.4, China 2.0.
  it('goes near the hand-picked zoom levels', () => {
    expect(focusZoomOf('CIV')).toBeCloseTo(3.8, 0)
    expect(focusZoomOf('IND')).toBeCloseTo(2.4, 0)
    expect(focusZoomOf('CHN')).toBeCloseTo(2.0, 0)
  })

  it('goes to 4.1 for countries as small as São Tomé and Príncipe or smaller', () => {
    expect(focusZoomOf('STP')).toBe(4.1)
    expect(focusZoomOf('BEL')).toBe(4.1)
    expect(focusZoomFor(1)).toBe(4.1)
  })

  it('keeps zooming out for countries bigger than Canada, down to 1.25', () => {
    expect(focusZoomOf('RUS')).toBeLessThan(focusZoomOf('CAN'))
    expect(focusZoomOf('RUS')).toBe(1.25)
  })

  it('zooms out further the wider the country', () => {
    expect(focusZoomFor(1000)).toBeGreaterThan(focusZoomFor(2000))
    expect(focusZoomFor(2000)).toBeGreaterThan(focusZoomFor(4000))
  })
})
