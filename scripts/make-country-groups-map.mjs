// Draws a world map of the country groups in src/data/countryGroups.json, for
// checking the groups by eye (not used by the app). Mercator, cropped to
// MAP_NORTH..MAP_SOUTH so Antarctica doesn't fill the picture. Each group has
// its colour on the globe (src/data/countryGroupColours.json); map areas
// outside the 197 countries (Greenland, Somaliland, etc.) are grey.
//
// Usage: node scripts/make-country-groups-map.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'
import { geoMercator, geoPath } from 'd3-geo'
import { loadCountryShapes } from '../src/shared/countries.ts'

const OUTPUT = 'docs/country-groups.png'
const WIDTH = 2400
const MAP_NORTH = 84
const MAP_SOUTH = -60

const groups = JSON.parse(readFileSync('src/data/countryGroups.json', 'utf8'))
// The globe's colours, saved by scripts/make-country-group-colours.mjs.
const groupColours = JSON.parse(readFileSync('src/data/countryGroupColours.json', 'utf8'))
const colourOf = {}
for (const group of groups) {
  for (const code of group.countries) colourOf[code] = groupColours[group.id]
}

// Scale so the whole width is 360°, then shift up so MAP_NORTH is the top edge.
const projection = geoMercator()
  .scale(WIDTH / (2 * Math.PI))
  .translate([WIDTH / 2, 0])
const top = projection([0, MAP_NORTH])[1]
const bottom = projection([0, MAP_SOUTH])[1]
projection.translate([WIDTH / 2, -top])
const height = Math.round(bottom - top)

const canvas = createCanvas(WIDTH, height)
const context = canvas.getContext('2d')
context.fillStyle = '#000'
context.fillRect(0, 0, WIDTH, height)

const path = geoPath(projection, context)
context.strokeStyle = '#fff'
context.lineWidth = 0.6
context.lineJoin = 'round'
for (const shape of loadCountryShapes()) {
  context.beginPath()
  path(shape.geometry)
  context.fillStyle = colourOf[shape.isoAlpha3] ?? '#555'
  context.fill()
  context.stroke()
}

writeFileSync(OUTPUT, canvas.toBuffer('image/png'))
console.log(`Wrote ${OUTPUT} (${WIDTH}x${height}, ${groups.length} groups)`)
