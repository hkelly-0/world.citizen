// Which parts of a country count as its "main landmass": what the globe
// frames when the country is tapped, and what its flashcard picture shows.
// Also used by scripts/make-country-images.mjs, which Node runs directly, so
// this file must only use TypeScript that Node can strip (no enums etc.) and
// give full file extensions in imports.
import { geoArea, geoCentroid, geoDistance } from 'd3-geo'
import type { Feature, Geometry, MultiPolygon, Polygon, Position } from 'geojson'
import overridesJson from '../../data/mainLandmassOverrides.json' with { type: 'json' }

// A hand-picked main landmass: every part whose centre falls inside the box
// counts. The box is [west, south, east, north] in degrees; for a country
// across the 180° meridian, east can go above 180 (e.g. 190 for 170°W).
export type MainLandmassOverride = {
  box: [number, number, number, number]
  // Why the automatic rule isn't right for this country.
  note: string
}

// Hand-written exceptions to the automatic rule, keyed by ISO alpha-3.
export const MAIN_LANDMASS_OVERRIDES = overridesJson as Record<string, MainLandmassOverride>

// Islands and territories whose nearest coastline is further than this from
// the centre of the country's largest part are left out (e.g. French Guiana
// for France). The distance is this many times the largest part's own radius,
// but at least the minimum.
const NEARBY_PARTS_RADIUS_MULTIPLE = 1.5
const NEARBY_PARTS_MIN_DEGREES = 2

const RADIANS_TO_DEGREES = 180 / Math.PI
// Kilometres along the globe per degree (Earth's mean radius is 6371 km).
const KM_PER_DEGREE = (6371 * Math.PI) / 180

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

function toMultiPolygon(parts: Feature<Polygon>[]): MultiPolygon {
  return { type: 'MultiPolygon', coordinates: parts.map((part) => part.geometry.coordinates) }
}

// The automatic rule: the country's largest part plus any parts near it.
function automaticMainLandmass(geometry: Geometry): MultiPolygon {
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
  return toMultiPolygon(nearbyParts)
}

// The parts whose centre falls inside the box (see MainLandmassOverride).
export function partsInBox(
  geometry: Geometry,
  [west, south, east, north]: MainLandmassOverride['box'],
): MultiPolygon {
  const inside = partsOf(geometry).filter((part) => {
    const [longitude, latitude] = geoCentroid(part)
    // Try the longitude both as it is and one turn east, so a box whose east
    // edge is above 180 also catches parts just west of 180°W.
    const isInLongitude = [longitude, longitude + 360].some((lng) => lng >= west && lng <= east)
    return isInLongitude && latitude >= south && latitude <= north
  })
  return toMultiPolygon(inside)
}

// The country's main landmass: its hand-written override if it has one,
// otherwise the automatic rule. isoAlpha3 is null for areas without a code.
export function mainLandmass(geometry: Geometry, isoAlpha3: string | null): MultiPolygon {
  const override = isoAlpha3 === null ? undefined : MAIN_LANDMASS_OVERRIDES[isoAlpha3]
  return override === undefined ? automaticMainLandmass(geometry) : partsInBox(geometry, override.box)
}

// How far across the country's main landmass is, in km: twice the distance
// from its centre to its furthest coastline point.
export function mainLandmassWidthKm(geometry: Geometry, isoAlpha3: string | null): number {
  const landmass = mainLandmass(geometry, isoAlpha3)
  const centre: [number, number] = geoCentroid(landmass)
  let furthestDegrees = 0
  for (const polygon of landmass.coordinates) {
    for (const point of polygon[0]) {
      furthestDegrees = Math.max(furthestDegrees, degreesFrom(centre, point))
    }
  }
  return 2 * furthestDegrees * KM_PER_DEGREE
}

// The centre of the country's main landmass, as [longitude, latitude].
export function mainLandmassCentre(geometry: Geometry, isoAlpha3: string | null): [number, number] {
  return geoCentroid(mainLandmass(geometry, isoAlpha3))
}
