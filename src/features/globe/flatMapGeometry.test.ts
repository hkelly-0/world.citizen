import { describe, expect, it } from 'vitest'
import type { Polygon } from 'geojson'
import { prepareGeometryForFlatMap } from './flatMapGeometry'

describe('prepareGeometryForFlatMap', () => {
  it('leaves a polygon that does not cross the 180° meridian unchanged', () => {
    const square: Polygon = {
      type: 'Polygon',
      coordinates: [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
    }
    expect(prepareGeometryForFlatMap(square)).toEqual(square)
  })

  it('makes longitudes continuous for an island crossing the 180° meridian', () => {
    // Like Fiji: from 179°E across to 179°W and back.
    const island: Polygon = {
      type: 'Polygon',
      coordinates: [[[179, -16], [-179, -16], [-179, -17], [179, -17], [179, -16]]],
    }
    expect(prepareGeometryForFlatMap(island)).toEqual({
      type: 'Polygon',
      coordinates: [[[179, -16], [181, -16], [181, -17], [179, -17], [179, -16]]],
    })
  })

  it('drops a pole ring and closes a coastline that circles the pole', () => {
    // Like Antarctica: a ring at the South Pole, then a coastline going all the
    // way round the world, crossing the 180° meridian once.
    const continent: Polygon = {
      type: 'Polygon',
      coordinates: [
        [[-180, -90], [0, -90], [180, -90], [-180, -90]],
        [[-180, -70], [-60, -65], [60, -65], [179, -70], [-180, -70]],
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
})
