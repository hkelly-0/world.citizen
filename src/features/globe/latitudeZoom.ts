// MapLibre draws the globe larger when its centre is nearer a pole, by
// 1/cos(latitude) (planetScaleAtLatitude in MapLibre's globe_utils.ts), so the
// same zoom shows a bigger globe there. This is how many zoom levels to take
// off at a latitude to draw the globe the size it is at the equator. Zero at
// the equator.
//
// MapLibre stops the stretch growing at the edge of the Mercator map, so this
// does too.
const MAPLIBRE_MAX_LATITUDE_DEGREES = 85.051129

export function latitudeZoomOut(latitude: number): number {
  const degrees = Math.min(Math.abs(latitude), MAPLIBRE_MAX_LATITUDE_DEGREES)
  return -Math.log2(Math.cos((degrees * Math.PI) / 180))
}
