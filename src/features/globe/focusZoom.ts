import { latitudeZoomOut } from './latitudeZoom'

// The zoom level the globe goes to when a country is tapped, from how wide
// its main landmass is (mainLandmassWidthKm). Countries up to TINY_COUNTRY_KM
// across (about São Tomé and Príncipe) go to the tiny-country zoom; wider ones
// zoom out by a fixed amount for every 1000 km of extra width.
//
// Phones (globe narrower than WIDE_SCREEN_MIN_PX): tiny countries 4.1, then
// 0.35 per 1000 km, e.g. Ivory Coast (850 km) to about 3.9, India (4700 km)
// 2.6 and China (5700 km) 2.2. Nothing is wide enough to reach MIN_FOCUS_ZOOM
// except Russia, which has its own zoom (see FOCUS_ZOOM_OVERRIDES).
//
// Wide screens (laptops) have room to zoom in further: tiny countries 4.3,
// then 0.255 per 1000 km, e.g. the USA (5300 km) to about 3.0 and China 2.9.
//
// The zooms above are for a country at the equator. MapLibre draws the globe
// larger the nearer its centre is to a pole, so countries elsewhere zoom out
// by latitudeZoomOut to be drawn the same size as at the equator, e.g. about
// 0.3 levels for China (37°N), so it goes to 1.9 on phones and 2.6 on laptops.
const TINY_COUNTRY_KM = 320
const MIN_FOCUS_ZOOM = 1.25
export const WIDE_SCREEN_MIN_PX = 768

const PHONE_TINY_COUNTRY_ZOOM = 4.1
const PHONE_ZOOM_OUT_PER_1000_KM = 0.35
const WIDE_SCREEN_TINY_COUNTRY_ZOOM = 4.3
const WIDE_SCREEN_ZOOM_OUT_PER_1000_KM = 0.255

// Hand-picked zooms for the largest northern countries, which looked too far
// out with the formula above. These are the zooms the globe goes to, with no
// latitude adjustment. Laptops stay as much more zoomed in than phones as the
// formula made them.
const FOCUS_ZOOM_OVERRIDES: Record<string, { phone: number; wideScreen: number }> = {
  RUS: { phone: 1.0, wideScreen: 1.45 },
  CAN: { phone: 1.4, wideScreen: 2.2 },
}

// latitude is the centre of the country's main landmass, in degrees.
export function focusZoomFor(
  isoAlpha3: string | null,
  widthKm: number,
  isWideScreen: boolean,
  latitude: number,
): number {
  const override = isoAlpha3 === null ? undefined : FOCUS_ZOOM_OVERRIDES[isoAlpha3]
  if (override !== undefined) return isWideScreen ? override.wideScreen : override.phone

  const tinyCountryZoom = isWideScreen ? WIDE_SCREEN_TINY_COUNTRY_ZOOM : PHONE_TINY_COUNTRY_ZOOM
  const zoomOutPer1000Km = isWideScreen
    ? WIDE_SCREEN_ZOOM_OUT_PER_1000_KM
    : PHONE_ZOOM_OUT_PER_1000_KM
  const equatorZoom =
    widthKm <= TINY_COUNTRY_KM
      ? tinyCountryZoom
      : Math.max(
          MIN_FOCUS_ZOOM,
          tinyCountryZoom - ((widthKm - TINY_COUNTRY_KM) / 1000) * zoomOutPer1000Km,
        )
  return equatorZoom - latitudeZoomOut(latitude)
}
