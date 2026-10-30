// Hand-written boxes on the globe, used to pick out parts of a country's
// outline: its main landmass (mainLandmassOverrides.json) and its far-off
// parts (farOffParts.json). Also used by scripts that Node runs directly, so
// this file must only use TypeScript that Node can strip (no enums etc.).
import { geoCentroid } from 'd3-geo'
import type { Polygon } from 'geojson'

// [west, south, east, north] in degrees. For a box across the 180° meridian,
// east can go above 180 (e.g. 190 for 170°W).
export type GeoBox = [number, number, number, number]

// Whether the polygon's centre falls inside the box.
export function isPolygonInBox(
  coordinates: Polygon['coordinates'],
  [west, south, east, north]: GeoBox,
): boolean {
  const [longitude, latitude] = geoCentroid({ type: 'Polygon', coordinates })
  // Try the longitude both as it is and one turn east, so a box whose east
  // edge is above 180 also catches parts just west of 180°W.
  const isInLongitude = [longitude, longitude + 360].some((lng) => lng >= west && lng <= east)
  return isInLongitude && latitude >= south && latitude <= north
}
