import type { Geometry, Position } from 'geojson'

// world-atlas outlines are made for a true globe: shapes that cross the 180°
// meridian (Russia, Fiji) or surround a pole (Antarctica) are stored as one
// piece. MapLibre draws on flat tiles, where such a shape would be stretched
// right around the world. This converts outlines into a form it can draw.
export function prepareGeometryForFlatMap(geometry: Geometry): Geometry {
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: preparePolygon(geometry.coordinates) }
  }
  if (geometry.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(preparePolygon) }
  }
  return geometry
}

// A ring whose every point is at least this far north or south is treated as
// running along a pole. world-atlas stores Antarctica's pole ring at -89.999,
// not exactly -90; no real coastline comes this close to a pole.
const POLE_RING_MIN_LATITUDE = 89.9

// A polygon is a list of rings: the outline first, then any holes.
function preparePolygon(rings: Position[][]): Position[][] {
  // Antarctica's first ring is just the South Pole (every point at latitude
  // -90), with its coastline after it. A ring at a single latitude encloses
  // no area on a flat map, so it is dropped and the coastline becomes the outline.
  return rings.filter((ring) => !isPoleRing(ring)).map(prepareRing)
}

function isPoleRing(ring: Position[]): boolean {
  return ring.every((point) => Math.abs(point[1]) >= POLE_RING_MIN_LATITUDE)
}

function prepareRing(ring: Position[]): Position[] {
  // Make longitudes continuous: when a step jumps by more than 180°, the ring
  // has crossed the 180° meridian, so later points are shifted by 360° to
  // continue on the same side (e.g. 179° then 181°, not 179° then -179°).
  // MapLibre handles longitudes past ±180° by wrapping them round the world.
  const continuous: Position[] = [ring[0]]
  let offset = 0
  for (let i = 1; i < ring.length; i++) {
    const step = ring[i][0] - ring[i - 1][0]
    if (step > 180) offset -= 360
    if (step < -180) offset += 360
    continuous.push([ring[i][0] + offset, ring[i][1]])
  }

  // If the ring crossed the 180° meridian once, it goes all the way round a
  // pole (Antarctica's coastline). Close it by running along the pole.
  const first = continuous[0]
  const last = continuous[continuous.length - 1]
  if (Math.abs(last[0] - first[0]) < 180) return continuous

  const averageLatitude = continuous.reduce((sum, point) => sum + point[1], 0) / continuous.length
  const poleLatitude = averageLatitude < 0 ? -90 : 90
  return [...continuous, [last[0], poleLatitude], [first[0], poleLatitude], first]
}
