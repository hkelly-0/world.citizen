import { describe, expect, it } from 'vitest'
import type { Polygon } from 'geojson'
import { loadCountryShapes } from '../../shared/countries'
import { hasPoleEdges, outlineWithoutPoleEdges, prepareGeometryForFlatMap } from './flatMapGeometry'

describe('prepareGeometryForFlatMap', () => {
  it('leaves a polygon that does not cross the 180° meridian unchanged', () => {
    const square: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [10, 10],
          [20, 10],
          [20, 20],
          [10, 20],
          [10, 10],
        ],
      ],
    }
    expect(prepareGeometryForFlatMap(square)).toEqual(square)
  })

  it('makes longitudes continuous for an island crossing the 180° meridian', () => {
    // Like Fiji: from 179°E across to 179°W and back.
    const island: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [179, -16],
          [-179, -16],
          [-179, -17],
          [179, -17],
          [179, -16],
        ],
      ],
    }
    expect(prepareGeometryForFlatMap(island)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [179, -16],
          [181, -16],
          [181, -17],
          [179, -17],
          [179, -16],
        ],
      ],
    })
  })

  it('drops a pole ring and closes a coastline that circles the pole', () => {
    // Like Antarctica: a ring at the South Pole, then a coastline going all the
    // way round the world, crossing the 180° meridian once.
    const continent: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-180, -90],
          [0, -90],
          [180, -90],
          [-180, -90],
        ],
        [
          [-180, -70],
          [-60, -65],
          [60, -65],
          [179, -70],
          [-180, -70],
        ],
      ],
    }
    expect(prepareGeometryForFlatMap(continent)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [-180, -70],
          [-60, -65],
          [60, -65],
          [179, -70],
          [180, -70],
          [180, -90],
          [-180, -90],
          [-180, -70],
        ],
      ],
    })
  })

  it('drops a pole ring that stops just short of the pole', () => {
    // world-atlas stores Antarctica's pole ring at -89.999, not -90.
    const continent: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-180, -89.999],
          [0, -89.999],
          [180, -89.999],
          [-180, -89.999],
        ],
        [
          [-180, -70],
          [60, -65],
          [179, -70],
          [-180, -70],
        ],
      ],
    }
    const prepared = prepareGeometryForFlatMap(continent) as Polygon
    expect(prepared.coordinates).toHaveLength(1)
    expect(prepared.coordinates[0][0]).toEqual([-180, -70])
  })
})

describe('outlineWithoutPoleEdges', () => {
  const poleShapes = loadCountryShapes().flatMap((shape) => {
    const prepared = prepareGeometryForFlatMap(shape.geometry)
    return hasPoleEdges(prepared) ? [{ name: shape.name, prepared }] : []
  })

  it('is needed only for Antarctica', () => {
    expect(poleShapes.map((shape) => shape.name)).toEqual(['Antarctica'])
  })

  it("leaves only real coast, with the mainland's ends meeting at the same place", () => {
    const lines = outlineWithoutPoleEdges(poleShapes[0].prepared).map((line) => line.coordinates)
    // The real coast's southernmost point, on the Ross Sea, is at about 85.2°S.
    expect(lines.flat().filter(([, latitude]) => latitude < -85.3)).toEqual([])
    const openLines = lines.filter((line) => line[0][0] !== line[line.length - 1][0])
    expect(openLines).toHaveLength(1)
    const first = openLines[0][0]
    const last = openLines[0][openLines[0].length - 1]
    expect(Math.abs(last[0] - first[0])).toBeCloseTo(360)
    expect(last[1]).toBeCloseTo(first[1])
  })
})
