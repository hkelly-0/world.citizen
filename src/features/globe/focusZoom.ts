import { latitudeZoomOut } from './latitudeZoom'

// The zoom level the globe goes to when a country is tapped, from how wide
// its main landmass is (mainLandmassWidthKm), counted in doublings of width
// from 1000 km (negative for narrower countries). A country 1000 km across goes
// to PHONE_ZOOM_AT_1000_KM, each doubling zooms out by about
// ZOOM_OUT_PER_WIDTH_DOUBLING, and ZOOM_OUT_PER_DOUBLING_SQUARED bends the curve
// so very small and very large countries zoom out a little more than that.
//
// Phones (globe narrower than WIDE_SCREEN_MIN_PX): fitted by least squares to
// hand-picked phone zooms (at the countries' own latitudes) for Monaco 5.8,
// El Salvador 4.6, Nicaragua 4.1, Colombia 3.2, Mexico 2.8, Brazil 2.5 and the
// USA 2.4. It gives Monaco about 5.8, El Salvador 4.6, Nicaragua 4.1,
// Colombia 3.3, Mexico 2.8, Brazil 2.6 and the USA 2.2: the USA and Brazil
// can't both fit, as the USA is wider and further from the equator but was
// picked only a little further out.
//
// Wide screens (laptops) have room to zoom in further, so they go
// WIDE_SCREEN_EXTRA_ZOOM levels closer than phones.
//
// The formula gives the zoom for a country at the equator. MapLibre draws the
// globe larger the nearer its centre is to a pole, so countries elsewhere zoom
// out by latitudeZoomOut to be drawn the same size as at the equator, e.g.
// about 0.3 levels for China (37°N), so it goes to about 2.2 on phones.
//
// index.css and CountryTable.css repeat this width in media queries (CSS
// can't read it), so change them together.
export const WIDE_SCREEN_MIN_PX = 768

const PHONE_ZOOM_AT_1000_KM = 3.7944
const ZOOM_OUT_PER_WIDTH_DOUBLING = 0.4549
const ZOOM_OUT_PER_DOUBLING_SQUARED = 0.0156
const WIDE_SCREEN_EXTRA_ZOOM = 0.2

// Widths below this count as this, so the zoom stays finite. The narrowest
// country, Vatican City, is about 1.4 km across.
const NARROWEST_WIDTH_KM = 1

// Hand-picked zooms for countries that looked wrong with the formula above.
// These are the zooms the globe goes to, with no latitude adjustment. Without
// a phone zoom, phones use the formula.
const FOCUS_ZOOM_OVERRIDES: Record<string, { phone?: number; wideScreen: number }> = {
  RUS: { phone: 1.0, wideScreen: 1.45 },
  CAN: { wideScreen: 2.0 },
}

// latitude is the centre of the country's main landmass, in degrees.
export function focusZoomFor(
  isoAlpha3: string | null,
  widthKm: number,
  isWideScreen: boolean,
  latitude: number,
): number {
  const override = isoAlpha3 === null ? undefined : FOCUS_ZOOM_OVERRIDES[isoAlpha3]
  if (override !== undefined) {
    if (isWideScreen) return override.wideScreen
    if (override.phone !== undefined) return override.phone
  }

  const widthDoublingsFrom1000Km = Math.log2(Math.max(widthKm, NARROWEST_WIDTH_KM) / 1000)
  const phoneEquatorZoom =
    PHONE_ZOOM_AT_1000_KM -
    widthDoublingsFrom1000Km * ZOOM_OUT_PER_WIDTH_DOUBLING -
    widthDoublingsFrom1000Km ** 2 * ZOOM_OUT_PER_DOUBLING_SQUARED
  const equatorZoom = isWideScreen ? phoneEquatorZoom + WIDE_SCREEN_EXTRA_ZOOM : phoneEquatorZoom
  return equatorZoom - latitudeZoomOut(latitude)
}
