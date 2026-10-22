import { geoArea, geoBounds, geoCentroid, geoDistance } from 'd3-geo'
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from 'geojson'

// Islands and territories whose nearest coastline is further than this from
// the centre of the country's largest part are left out (e.g. French Guiana
// for France). The distance is this many times the largest part's own radius,
// but at least the minimum. Same rule as scripts/make-country-images.mjs.
const NEARBY_PARTS_RADIUS_MULTIPLE = 1.5
const NEARBY_PARTS_MIN_DEGREES = 2

const RADIANS_TO_DEGREES = 180 / Math.PI

// Distance in degrees along the globe from the centre to a [longitude, latitude].
function degreesFrom(centre: [number, number], point: Position): number {
  return geoDistance(centre, [point[0], point[1]]) * RADIANS_TO_DEGREES
}

// Splits a Polygon or MultiPolygon into one Polygon feature per part.
function partsOf(geometry: Geometry): Feature<Polygon>[] {
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    throw new Error(`Unexpected geometry type ${geometry.type}`)
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.map((coordinates) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates },
  }))
}

// The country's largest part plus any parts near it, as one MultiPolygon.
function mainLandmass(geometry: Geometry): MultiPolygon {
  const parts = partsOf(geometry)
  const largest = parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a))
  const centre = geoCentroid(largest)
  // The furthest point of the largest part from its centre, in degrees.
  const largestRadius = Math.max(
    ...largest.geometry.coordinates[0].map((point) => degreesFrom(centre, point)),
  )
  const maxDistance = Math.max(NEARBY_PARTS_MIN_DEGREES, largestRadius * NEARBY_PARTS_RADIUS_MULTIPLE)

  // A part's distance is to its nearest coastline point, not its centre, so
  // big neighbouring islands (e.g. New Zealand's North Island) are kept.
  const nearbyParts = parts.filter((part) => {
    const nearestDistance = Math.min(
      ...part.geometry.coordinates[0].map((point) => degreesFrom(centre, point)),
    )
    return nearestDistance <= maxDistance
  })
  return { type: 'MultiPolygon', coordinates: nearbyParts.map((part) => part.geometry.coordinates) }
}

// The box around the country's main landmass, as [west, south, east, north]
// in degrees. A country across the 180° meridian (Russia, Fiji) has an east
// above 180, so that east is always greater than west.
export function mainLandmassBounds(geometry: Geometry): [number, number, number, number] {
  const [[west, south], [east, north]] = geoBounds(mainLandmass(geometry))
  return [west, south, east < west ? east + 360 : east, north]
}
