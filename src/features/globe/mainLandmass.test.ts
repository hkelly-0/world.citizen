import { describe, expect, it } from 'vitest'
import { loadCountryShapes, wholeCountryGeometry } from '../../shared/countries'
import { MAIN_LANDMASS_OVERRIDES, mainLandmassWidthKm, partsInBox } from './mainLandmass'

const shapes = loadCountryShapes()

// The whole country, with the far-off parts that loadCountryShapes splits off
// (e.g. French Guiana), as the globe and pictures frame it.
function shapeOf(isoAlpha3: string) {
  return { isoAlpha3, geometry: wholeCountryGeometry(shapes, isoAlpha3) }
}

describe('mainLandmassWidthKm', () => {
  it('leaves out far-off territories, e.g. French Guiana for France', () => {
    // Mainland France is about 1000 km across; with French Guiana it would be
    // over 7000 km.
    const width = mainLandmassWidthKm(shapeOf('FRA').geometry, 'FRA')

    expect(width).toBeGreaterThan(900)
    expect(width).toBeLessThan(2000)
  })

  it('measures a country across the 180° meridian the short way round', () => {
    // Russia is about 9000 km across; measured the wrong way round the globe
    // it would be far more.
    const width = mainLandmassWidthKm(shapeOf('RUS').geometry, 'RUS')

    expect(width).toBeGreaterThan(7000)
    expect(width).toBeLessThan(10000)
  })
})

describe('partsInBox', () => {
  it('keeps the parts whose centre is inside the box, e.g. the USA with Alaska and Hawaii', () => {
    const usa = shapeOf('USA').geometry
    const withAlaskaAndHawaii = partsInBox(usa, [-170, 18, -66, 72])
    const mainlandOnly = partsInBox(usa, [-125, 24, -66, 50])

    expect(withAlaskaAndHawaii.coordinates.length).toBeGreaterThan(mainlandOnly.coordinates.length)
    // Every [longitude, latitude] point of the kept parts.
    const points = withAlaskaAndHawaii.coordinates.flat(2)
    expect(Math.min(...points.map(([longitude]) => longitude))).toBeLessThan(-150)
    expect(Math.min(...points.map(([, latitude]) => latitude))).toBeLessThan(23)
  })

  it('catches parts just west of 180°W when the box goes past 180', () => {
    // Russia's Chukotka reaches past 180° into the western hemisphere.
    const russia = shapeOf('RUS').geometry
    const farEast = partsInBox(russia, [160, 60, 200, 75])

    expect(farEast.coordinates.length).toBeGreaterThan(0)
  })
})

describe('MAIN_LANDMASS_OVERRIDES', () => {
  // Catches typos: a wrong code, or a box that misses every part and so
  // leaves nothing to frame.
  it("names real countries, and each box selects at least one of the country's parts", () => {
    for (const [isoAlpha3, override] of Object.entries(MAIN_LANDMASS_OVERRIDES)) {
      const selected = partsInBox(shapeOf(isoAlpha3).geometry, override.box)
      expect(selected.coordinates.length, isoAlpha3).toBeGreaterThan(0)
    }
  })
})
