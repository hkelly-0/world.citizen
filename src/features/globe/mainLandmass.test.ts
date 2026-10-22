import { describe, expect, it } from 'vitest'
import { loadCountryShapes } from '../../shared/countries'
import { mainLandmassBounds } from './mainLandmass'

const shapes = loadCountryShapes()

function boundsOf(isoAlpha3: string) {
  const shape = shapes.find((country) => country.isoAlpha3 === isoAlpha3)
  if (shape === undefined) throw new Error(`No shape for ${isoAlpha3}`)
  return mainLandmassBounds(shape.geometry)
}

describe('mainLandmassBounds', () => {
  it('leaves out far-off territories, e.g. French Guiana for France', () => {
    const [west, south, east, north] = boundsOf('FRA')

    expect(west).toBeGreaterThan(-6)
    expect(east).toBeLessThan(10)
    expect(south).toBeGreaterThan(41)
    expect(north).toBeLessThan(52)
  })

  it('gives an east above 180 for a country across the 180° meridian', () => {
    const [west, , east] = boundsOf('RUS')

    expect(east).toBeGreaterThan(180)
    expect(east).toBeGreaterThan(west)
  })
})
