import { describe, expect, it } from 'vitest'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import farOffParts from '../data/farOffParts.json'
import { countryCodeOfShape, loadCountryShapes, splitRingAtLatitude } from './countries'

describe('loadCountryShapes', () => {
  const shapes = loadCountryShapes()

  it('loads every country outline from the 1:50m dataset, plus Tuvalu and the far-off parts', () => {
    expect(shapes.length).toBe(242 + farOffParts.length)
  })

  it("splits far-off parts from their country, keeping the country's code as partOf", () => {
    const frenchGuiana = shapes.find((shape) => shape.name === 'French Guiana')
    const france = shapes.find((shape) => shape.isoAlpha3 === 'FRA')
    expect(frenchGuiana?.isoAlpha3).toBeNull()
    expect(frenchGuiana?.partOf).toBe('FRA')
    // French Guiana, Guadeloupe, and Martinique are split off, so nothing of
    // France is left in the Americas (west of 50°W).
    const isInTheAmericas = ([longitude]: Position) => longitude < -50
    if (france === undefined) throw new Error('No shape for FRA')
    expect(france.geometry.type).toBe('MultiPolygon')
    const franceRings = (france.geometry as MultiPolygon).coordinates.map((polygon) => polygon[0])
    expect(franceRings.some((ring) => ring.some(isInTheAmericas))).toBe(false)
  })

  it("moves the Morocco–Western Sahara border to Natural Earth's 27°40'N corner", () => {
    const morocco = shapes.find((shape) => shape.isoAlpha3 === 'MAR')
    const westernSahara = shapes.find((shape) => shape.isoAlpha3 === 'ESH')
    if (morocco === undefined || westernSahara === undefined) throw new Error('No MAR or ESH')
    const latitudes = (shape: typeof morocco) =>
      (shape.geometry as Polygon).coordinates[0].map((point) => point[1])
    // The corner is at 27°39'25"N.
    expect(Math.min(...latitudes(morocco))).toBeCloseTo(27.657, 3)
    expect(Math.max(...latitudes(westernSahara))).toBeCloseTo(27.657, 3)
    // Western Sahara reaches the Mauritanian border at Lagouira, near 21°N.
    expect(Math.min(...latitudes(westernSahara))).toBeLessThan(21)
    expect(westernSahara.name).toBe('Western Sahara')
  })

  it('includes Tuvalu, which the 1:50m dataset leaves out', () => {
    const tuvalu = shapes.find((shape) => shape.isoAlpha3 === 'TUV')
    expect(tuvalu?.isoNumeric).toBe('798')
    expect(tuvalu?.geometry.type).toBe('MultiPolygon')
  })

  it('maps ISO numeric codes to alpha-3 codes', () => {
    const peru = shapes.find((shape) => shape.name === 'Peru')
    expect(peru?.isoNumeric).toBe('604')
    expect(peru?.isoAlpha3).toBe('PER')
  })

  it('keeps the leading zeros of numeric codes', () => {
    const afghanistan = shapes.find((shape) => shape.name === 'Afghanistan')
    expect(afghanistan?.isoNumeric).toBe('004')
    expect(afghanistan?.isoAlpha3).toBe('AFG')
  })

  it('uses null codes for areas without an ISO code', () => {
    const somaliland = shapes.find((shape) => shape.name === 'Somaliland')
    expect(somaliland?.isoNumeric).toBeNull()
    expect(somaliland?.isoAlpha3).toBeNull()
  })

  it('gives Kosovo, which has no ISO code, our code for it', () => {
    const kosovo = shapes.find((shape) => shape.name === 'Kosovo')
    expect(kosovo?.isoNumeric).toBeNull()
    expect(kosovo?.isoAlpha3).toBe('XKX')
  })

  it('gives each country code to only one shape', () => {
    const codes = shapes.flatMap((shape) => (shape.isoAlpha3 === null ? [] : [shape.isoAlpha3]))
    expect(codes.length).toBe(new Set(codes).size)
  })

  it('gives every shape with a numeric code an alpha-3 code', () => {
    const missingAlpha3 = shapes.filter(
      (shape) => shape.isoNumeric !== null && shape.isoAlpha3 === null,
    )
    expect(missingAlpha3).toEqual([])
  })
  it('gives every shape its own name, so far-off parts can be told apart', () => {
    const names = shapes.map((shape) => shape.name)
    expect(names.length).toBe(new Set(names).size)
  })
})

describe('splitRingAtLatitude', () => {
  it('cuts a ring in two along the line, adding the crossing points to both', () => {
    const square = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ]
    expect(splitRingAtLatitude(square, 1)).toEqual({
      north: [
        [2, 1],
        [2, 2],
        [0, 2],
        [0, 1],
        [2, 1],
      ],
      south: [
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
        [0, 0],
      ],
    })
  })

  it('puts a point exactly on the line in both parts', () => {
    const diamond = [
      [0, 1],
      [1, 0],
      [2, 1],
      [1, 2],
      [0, 1],
    ]
    const { north, south } = splitRingAtLatitude(diamond, 1)
    expect(north).toEqual([
      [0, 1],
      [2, 1],
      [1, 2],
      [0, 1],
    ])
    expect(south).toEqual([
      [0, 1],
      [1, 0],
      [2, 1],
      [0, 1],
    ])
  })

  it('throws if the ring meets the line other than twice', () => {
    const square = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ]
    expect(() => splitRingAtLatitude(square, 3)).toThrow()
  })
})

describe('countryCodeOfShape', () => {
  it("is a country's own code, or the country a far-off part belongs to", () => {
    expect(countryCodeOfShape({ isoAlpha3: 'FRA', partOf: null })).toBe('FRA')
    expect(countryCodeOfShape({ isoAlpha3: null, partOf: 'FRA' })).toBe('FRA')
    expect(countryCodeOfShape({ isoAlpha3: null, partOf: null })).toBeNull()
  })
})
