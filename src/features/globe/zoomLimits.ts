// How far the user can zoom the globe out and in. The limits are given for the
// equator. Wide screens (laptops) have a larger minimum than phones.
//
// MapLibre draws the globe larger when its centre is nearer a pole (by
// 1/cos(latitude)), so the same zoom shows a bigger globe there.
// - Minimum: MapLibre's globe already lowers the minimum zoom by this amount
//   itself, so the zoomed-out globe is the same size at any latitude. The
//   minimum is passed to MapLibre unchanged.
// - Maximum: MapLibre doesn't adjust it, so it is lowered here by the same
//   amount, so the closest view shows the same amount of ground at any latitude.
import { WIDE_SCREEN_MIN_PX } from './focusZoom'
import { latitudeZoomOut } from './latitudeZoom'

const PHONE_MIN_ZOOM_AT_EQUATOR = 1.3
const WIDE_SCREEN_MIN_ZOOM_AT_EQUATOR = 1.8
const MAX_ZOOM_AT_EQUATOR = 7

// latitude is the centre of the map, in degrees; mapWidthPx is the map's width.
export function zoomLimitsFor(
  latitude: number,
  mapWidthPx: number,
): { minZoom: number; maxZoom: number } {
  const minAtEquator =
    mapWidthPx >= WIDE_SCREEN_MIN_PX ? WIDE_SCREEN_MIN_ZOOM_AT_EQUATOR : PHONE_MIN_ZOOM_AT_EQUATOR
  return { minZoom: minAtEquator, maxZoom: MAX_ZOOM_AT_EQUATOR - latitudeZoomOut(latitude) }
}
