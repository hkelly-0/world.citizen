import type { CountryShape } from '../../shared/countries'
import { mainLandmass, mainLandmassCentre } from './mainLandmass'

// The box around a group of countries' main landmasses, as
// [[west, south], [east, north]], for flying the region globe to a region.
// Longitudes are measured from the first country's centre, so a region across
// the 180° meridian (e.g. Polynesia) gets a narrow box whose east edge is past
// 180, rather than one spanning the whole world.
export function regionBounds(
  shapes: Pick<CountryShape, 'geometry' | 'isoAlpha3'>[],
): [[number, number], [number, number]] {
  const referenceLongitude = mainLandmassCentre(shapes[0].geometry, shapes[0].isoAlpha3)[0]
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity
  for (const shape of shapes) {
    for (const polygon of mainLandmass(shape.geometry, shape.isoAlpha3).coordinates) {
      for (const [longitude, latitude] of polygon[0]) {
        // The same longitude, moved by whole turns to within 180° of the reference.
        const unwrapped = longitude - 360 * Math.round((longitude - referenceLongitude) / 360)
        west = Math.min(west, unwrapped)
        east = Math.max(east, unwrapped)
        south = Math.min(south, latitude)
        north = Math.max(north, latitude)
      }
    }
  }
  return [
    [west, south],
    [east, north],
  ]
}
