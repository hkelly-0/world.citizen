import { describe, expect, it } from 'vitest'
import { loadCountryShapes } from './countries'

describe('loadCountryShapes', () => {
  const shapes = loadCountryShapes()

  it('loads every country outline from the 1:50m dataset', () => {
    expect(shapes.length).toBe(241)
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
    const kosovo = shapes.find((shape) => shape.name === 'Kosovo')
    expect(kosovo?.isoNumeric).toBeNull()
    expect(kosovo?.isoAlpha3).toBeNull()
  })

  it('keeps a real outline for every country after simplifying borders', () => {
    // A ring needs at least 3 distinct points to enclose an area.
    function hasArea(ring: number[][]) {
      return new Set(ring.map((point) => point.join(','))).size >= 3
    }
    const shapesWithoutArea = shapes.filter((shape) => {
      const polygons =
        shape.geometry.type === 'Polygon'
          ? [shape.geometry.coordinates]
          : shape.geometry.type === 'MultiPolygon'
            ? shape.geometry.coordinates
            : []
      return !polygons.every((polygon) => hasArea(polygon[0]))
    })
    expect(shapesWithoutArea.map((shape) => shape.name)).toEqual([])
  })

  it('loads the same countries with full-detail borders', () => {
    const fullShapes = loadCountryShapes('full')
    expect(fullShapes.map((shape) => shape.name)).toEqual(shapes.map((shape) => shape.name))
  })

  it('gives every shape with a numeric code an alpha-3 code', () => {
    const missingAlpha3 = shapes.filter(
      (shape) => shape.isoNumeric !== null && shape.isoAlpha3 === null,
    )
    expect(missingAlpha3).toEqual([])
  })
})
