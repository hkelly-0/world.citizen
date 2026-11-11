import { describe, expect, it } from 'vitest'
import type { MultiPolygon, Position } from 'geojson'
import farOffParts from '../data/farOffParts.json'
import { countryCodeOfShape, loadCountryShapes } from './countries'

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

describe('countryCodeOfShape', () => {
  it("is a country's own code, or the country a far-off part belongs to", () => {
    expect(countryCodeOfShape({ isoAlpha3: 'FRA', partOf: null })).toBe('FRA')
    expect(countryCodeOfShape({ isoAlpha3: null, partOf: 'FRA' })).toBe('FRA')
    expect(countryCodeOfShape({ isoAlpha3: null, partOf: null })).toBeNull()
  })
})
