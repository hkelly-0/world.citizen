import { describe, expect, it } from 'vitest'
import { COUNTRY_GROUPS } from '../../shared/countryFacts'
import { loadCountryShapes } from '../../shared/countries'
import { regionBounds } from './regionBounds'

const SHAPES = loadCountryShapes()

function groupShapes(groupId: string) {
  const codes = COUNTRY_GROUPS.find((group) => group.id === groupId)!.countries
  return SHAPES.filter((shape) => shape.isoAlpha3 !== null && codes.includes(shape.isoAlpha3))
}

describe('regionBounds', () => {
  it('boxes the main landmasses of the countries', () => {
    const [[west, south], [east, north]] = regionBounds(groupShapes('iberia'))
    // Spain, Portugal and Andorra: roughly 9.5°W to 4.3°E (Spain's main
    // landmass includes the Balearic Islands, out to Menorca), 36°N to 44°N.
    expect(west).toBeCloseTo(-9.5, 0)
    expect(east).toBeCloseTo(4.3, 0)
    expect(south).toBeCloseTo(36, 0)
    expect(north).toBeCloseTo(43.8, 0)
  })

  it('keeps a region across the 180° meridian narrow', () => {
    // Samoa, Tonga and Tuvalu lie on both sides of 180°.
    const [[west], [east]] = regionBounds(groupShapes('polynesia'))
    expect(east - west).toBeLessThan(30)
  })
})
