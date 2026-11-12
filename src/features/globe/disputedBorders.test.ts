import { describe, expect, it } from 'vitest'
import type { Feature, LineString, Polygon } from 'geojson'
import { loadCountryShapes } from '../../shared/countries'
import { borderLineFeatures, DISPUTED_BORDERS } from './disputedBorders'

// The lines that are dashed (disputed true) or solid (false).
function linesOf(features: Feature<LineString>[], disputed: boolean) {
  return features
    .filter((feature) => feature.properties?.disputed === disputed)
    .map((feature) => feature.geometry.coordinates)
}

describe('DISPUTED_BORDERS', () => {
  const shapes = loadCountryShapes()

  it('names only shapes on the map', () => {
    const names = new Set(shapes.map((shape) => shape.name))
    expect(DISPUTED_BORDERS.flat().filter((name) => !names.has(name))).toEqual([])
  })

  it.each(DISPUTED_BORDERS)('gives %s and %s a shared border to dash', (first, second) => {
    expect(linesOf(borderLineFeatures(shapes, [[first, second]]), true).length).toBeGreaterThan(0)
  })

  it('dashes each edge only once', () => {
    const dashedEdges = linesOf(borderLineFeatures(shapes, DISPUTED_BORDERS), true).flatMap(
      (line) => line.slice(1).map((point, i) => [line[i], point].map(String).sort().join('|')),
    )
    expect(dashedEdges.length).toBe(new Set(dashedEdges).size)
  })
})

describe('borderLineFeatures', () => {
  // Two unit squares side by side, sharing the edge at x = 1.
  const left: Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  }
  const right: Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [1, 0],
        [2, 0],
        [2, 1],
        [1, 1],
        [1, 0],
      ],
    ],
  }
  const features = borderLineFeatures(
    [
      { name: 'Left', geometry: left },
      { name: 'Right', geometry: right },
    ],
    [['Left', 'Right']],
  )

  it("dashes the shared edge once, from the pair's first shape", () => {
    expect(linesOf(features, true)).toEqual([
      [
        [1, 0],
        [1, 1],
      ],
    ])
  })

  it('keeps the rest of both outlines solid, each as one line', () => {
    expect(linesOf(features, false)).toEqual([
      [
        [1, 1],
        [0, 1],
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [2, 0],
        [2, 1],
        [1, 1],
      ],
    ])
  })
})
