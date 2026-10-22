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
//
// Near the poles the map's zoom shows less ground (Mercator stretches
// everything by 1/cos(latitude)), so countries centred north or south of
// HIGH_LATITUDE_DEGREES (e.g. Greenland, 73°N) zoom out by the extra amount.
// Countries below that (including Russia, Canada and Norway) keep the
// hand-picked zooms above.
const TINY_COUNTRY_KM = 320
const MIN_FOCUS_ZOOM = 1.25
export const WIDE_SCREEN_MIN_PX = 768

const HIGH_LATITUDE_DEGREES = 66
// Mercator's stretch alone left Greenland too close, because it is also tall
// and narrow, so the correction is multiplied (chosen by eye).
const HIGH_LATITUDE_ZOOM_OUT_MULTIPLE = 3
// Stops the correction blowing up as cos(latitude) approaches 0 at the poles.
const MAX_LATITUDE_DEGREES = 80

const PHONE_TINY_COUNTRY_ZOOM = 4.1
const PHONE_ZOOM_OUT_PER_1000_KM = 0.41
const WIDE_SCREEN_TINY_COUNTRY_ZOOM = 4.3
const WIDE_SCREEN_ZOOM_OUT_PER_1000_KM = 0.314

// Zoom levels to take off at a latitude, so the country fills the same part of
// the screen as it would near the equator. Zero up to HIGH_LATITUDE_DEGREES.
function highLatitudeZoomOut(latitude: number): number {
  const degrees = Math.min(Math.abs(latitude), MAX_LATITUDE_DEGREES)
  if (degrees <= HIGH_LATITUDE_DEGREES) return 0
  const toRadians = Math.PI / 180
  const mercatorStretch = Math.cos(HIGH_LATITUDE_DEGREES * toRadians) / Math.cos(degrees * toRadians)
  return Math.log2(mercatorStretch) * HIGH_LATITUDE_ZOOM_OUT_MULTIPLE
}

// latitude is the centre of the country's main landmass, in degrees.
export function focusZoomFor(widthKm: number, isWideScreen: boolean, latitude: number): number {
  const tinyCountryZoom = isWideScreen ? WIDE_SCREEN_TINY_COUNTRY_ZOOM : PHONE_TINY_COUNTRY_ZOOM
  const zoomOutPer1000Km = isWideScreen ? WIDE_SCREEN_ZOOM_OUT_PER_1000_KM : PHONE_ZOOM_OUT_PER_1000_KM
  const latitudeZoomOut = highLatitudeZoomOut(latitude)
  if (widthKm <= TINY_COUNTRY_KM) return tinyCountryZoom - latitudeZoomOut
  const zoom = tinyCountryZoom - ((widthKm - TINY_COUNTRY_KM) / 1000) * zoomOutPer1000Km
  return Math.max(MIN_FOCUS_ZOOM, zoom - latitudeZoomOut)
}
