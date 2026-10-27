// Simplifies the land for the main menu's spinning logo
// (src/features/menu/SpinningLogo.tsx) and saves it to src/data/logoLand.json.
//
// The logo's globe is only a few dozen pixels across, so most of Natural
// Earth 1:110m's points (from world-atlas) are too close together to see, but
// each still costs time to project every time the logo is redrawn. Simplifying
// removes them, making each redraw several times faster.
//
// The JSON is a GeoJSON MultiPolygon of all the land, coordinates rounded to
// COORDINATE_DIGITS decimal places of a degree.
//
// Usage: node scripts/make-logo-land.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { presimplify, simplify } from 'topojson-simplify'

const OUTPUT = 'src/data/logoLand.json'

// Points that make a triangle smaller than this with their neighbours, in
// square degrees, are removed (Visvalingam's method). Chosen by eye against
// the full outline at the logo's size on a phone: larger values start to lose
// small islands and coastline shapes (e.g. the Caribbean, Indonesia).
const MIN_TRIANGLE_AREA = 1
// About 1 km, far below a pixel on the logo.
const COORDINATE_DIGITS = 2

const topology = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'))
const simplified = simplify(presimplify(topology), MIN_TRIANGLE_AREA)
// land-110m has a single feature holding every piece of land.
const land = feature(simplified, simplified.objects.land).features[0].geometry

const factor = 10 ** COORDINATE_DIGITS
const roundedLand = {
  type: 'MultiPolygon',
  coordinates: land.coordinates.map((polygon) =>
    polygon.map((ring) =>
      ring.map(([longitude, latitude]) => [
        Math.round(longitude * factor) / factor,
        Math.round(latitude * factor) / factor,
      ]),
    ),
  ),
}

writeFileSync(OUTPUT, JSON.stringify(roundedLand) + '\n')
const pointCount = roundedLand.coordinates.flat(2).length
console.log(`Wrote ${OUTPUT} (${pointCount} points)`)
