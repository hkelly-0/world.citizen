// The zoom level the globe goes to when a country is tapped, from how wide
// its main landmass is (mainLandmassWidthKm). Countries up to TINY_COUNTRY_KM
// across (about São Tomé and Príncipe) go to the tiny-country zoom; wider ones
// zoom out by a fixed amount for every 1000 km of extra width.
//
// Phones (globe narrower than WIDE_SCREEN_MIN_PX): tiny countries 4.1, then
// 0.41 per 1000 km, e.g. Ivory Coast (850 km) to about 3.9, India (4700 km)
// 2.3, China (5700 km) 1.9 and Canada (6350 km) 1.6. The widest country
// (Russia) stops at MIN_FOCUS_ZOOM.
//
// Wide screens (laptops) have room to zoom in further: tiny countries 4.3,
// then 0.314 per 1000 km, e.g. the USA (5300 km) to about 2.7, China 2.6 and
// Russia (8700 km) 1.7.
const TINY_COUNTRY_KM = 320
const MIN_FOCUS_ZOOM = 1.25
export const WIDE_SCREEN_MIN_PX = 768

const PHONE_TINY_COUNTRY_ZOOM = 4.1
const PHONE_ZOOM_OUT_PER_1000_KM = 0.41
const WIDE_SCREEN_TINY_COUNTRY_ZOOM = 4.3
const WIDE_SCREEN_ZOOM_OUT_PER_1000_KM = 0.314

export function focusZoomFor(widthKm: number, isWideScreen: boolean): number {
  const tinyCountryZoom = isWideScreen ? WIDE_SCREEN_TINY_COUNTRY_ZOOM : PHONE_TINY_COUNTRY_ZOOM
  const zoomOutPer1000Km = isWideScreen ? WIDE_SCREEN_ZOOM_OUT_PER_1000_KM : PHONE_ZOOM_OUT_PER_1000_KM
  if (widthKm <= TINY_COUNTRY_KM) return tinyCountryZoom
  const zoom = tinyCountryZoom - ((widthKm - TINY_COUNTRY_KM) / 1000) * zoomOutPer1000Km
  return Math.max(MIN_FOCUS_ZOOM, zoom)
}
