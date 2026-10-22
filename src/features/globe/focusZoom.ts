// The zoom level the globe goes to when a country is tapped, from how wide
// its main landmass is (mainLandmassWidthKm). Countries up to TINY_COUNTRY_KM
// across (about São Tomé and Príncipe) go to TINY_COUNTRY_ZOOM; wider ones
// zoom out by ZOOM_OUT_PER_1000_KM for every 1000 km of extra width, e.g.
// Ivory Coast (850 km) to about 3.9, India (4700 km) 2.3, China (5700 km)
// 1.9 and Canada (6350 km) 1.6. The widest countries (Russia, USA) stop at
// MIN_FOCUS_ZOOM.
const TINY_COUNTRY_KM = 320
const TINY_COUNTRY_ZOOM = 4.1
const ZOOM_OUT_PER_1000_KM = 0.41
const MIN_FOCUS_ZOOM = 1.25

export function focusZoomFor(widthKm: number): number {
  if (widthKm <= TINY_COUNTRY_KM) return TINY_COUNTRY_ZOOM
  const zoom = TINY_COUNTRY_ZOOM - ((widthKm - TINY_COUNTRY_KM) / 1000) * ZOOM_OUT_PER_1000_KM
  return Math.max(MIN_FOCUS_ZOOM, zoom)
}
