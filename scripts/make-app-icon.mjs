// Draws the app icon: a dark blue person outline (ring and shoulders) on
// white, whose head is a globe facing the Americas (navy sea, green land).
// The land is Natural Earth 1:110m from world-atlas, simple enough to read at
// launcher size. Run from the project root; the icons are committed.
//
// Writes, for each screen density, into android/app/src/main/res/mipmap-*/:
// - ic_launcher_foreground.png: the person on a transparent background, for
//   Android 8+ adaptive icons. The white background behind it is the colour
//   ic_launcher_background in res/values/ic_launcher_background.xml.
// - ic_launcher.png and ic_launcher_round.png: the person on a white disc, for
//   Android 7 (the app supports Android 7 and up).
// And for the website, into public/:
// - favicon.svg: the person on a white disc, for the browser tab.
// - apple-touch-icon.png: the person on a white square, used when the site is
//   added to an iPhone or iPad home screen (iOS rounds the corners itself and
//   would turn transparent parts black).
//
// Usage: node scripts/make-app-icon.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'
import { geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

const RESOURCES = 'android/app/src/main/res'
const WEBSITE = 'public'

// The design is drawn on a DESIGN_SIZE square, then scaled to each icon size.
const DESIGN_SIZE = 1024
const CENTRE = DESIGN_SIZE / 2

const BACKGROUND_COLOR = '#ffffff'
const PERSON_COLOR = '#1b2f5c'
// The same navy as the ring and shoulders.
const SEA_COLOR = PERSON_COLOR
const LAND_COLOR = '#3fae4a'

// The ring around the person.
const RING_RADIUS = 440
const RING_WIDTH = 34
const RING_OUTER_RADIUS = RING_RADIUS + RING_WIDTH / 2
// The globe head.
const HEAD_CENTRE_Y = 375
const HEAD_RADIUS = 195
// The shoulders are the top of a large oval, wider than it is tall, cut off by
// the ring.
const SHOULDERS_CENTRE_Y = 905
const SHOULDERS_HALF_WIDTH = 345
const SHOULDERS_HALF_HEIGHT = 300

// The point on the globe facing the viewer: between North and South America.
const GLOBE_FACING = { longitude: -80, latitude: 8 }

// Icon sizes in pixels per screen density. Adaptive icon layers are 108 dp
// square; launchers may crop anything outside the middle 66 dp circle, so the
// ring is fitted inside that. Android 7 icons are 48 dp square.
const DENSITIES = [
  { folder: 'mipmap-mdpi', scale: 1 },
  { folder: 'mipmap-hdpi', scale: 1.5 },
  { folder: 'mipmap-xhdpi', scale: 2 },
  { folder: 'mipmap-xxhdpi', scale: 3 },
  { folder: 'mipmap-xxxhdpi', scale: 4 },
]
const ADAPTIVE_LAYER_DP = 108
const ADAPTIVE_SAFE_DIAMETER_DP = 66
const LEGACY_ICON_DP = 48
// On Android 7 icons, the ring's outer edge as a fraction of the icon's width.
const LEGACY_RING_FRACTION = 0.96
// The iOS home screen icon, with the ring's outer edge as a fraction of its
// width (leaving a white margin inside iOS's rounded corners).
const APPLE_TOUCH_ICON_SIZE = 180
const APPLE_TOUCH_RING_FRACTION = 0.88
// Decimal places for coordinates in favicon.svg, to keep the file small.
const SVG_DIGITS = 1

const topology = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'))
const land = feature(topology, topology.objects.land)

// The globe head's projection, in design coordinates.
function headProjection() {
  return geoOrthographic()
    .rotate([-GLOBE_FACING.longitude, -GLOBE_FACING.latitude])
    .scale(HEAD_RADIUS)
    .translate([CENTRE, HEAD_CENTRE_Y])
    .clipAngle(90)
}

// Draws the person (ring, shoulders and globe head) in design coordinates,
// with nothing behind it.
function drawPerson(context) {
  // Shoulders, clipped to the inside of the ring.
  context.save()
  context.beginPath()
  context.arc(CENTRE, CENTRE, RING_RADIUS, 0, 2 * Math.PI)
  context.clip()
  context.fillStyle = PERSON_COLOR
  context.beginPath()
  context.ellipse(CENTRE, SHOULDERS_CENTRE_Y, SHOULDERS_HALF_WIDTH, SHOULDERS_HALF_HEIGHT, 0, 0, 2 * Math.PI)
  context.fill()
  context.restore()

  // Ring.
  context.strokeStyle = PERSON_COLOR
  context.lineWidth = RING_WIDTH
  context.beginPath()
  context.arc(CENTRE, CENTRE, RING_RADIUS, 0, 2 * Math.PI)
  context.stroke()

  // Globe head: sea, then land, clipped to the globe's circle.
  const path = geoPath(headProjection(), context)

  context.fillStyle = SEA_COLOR
  context.beginPath()
  path({ type: 'Sphere' })
  context.fill()

  context.fillStyle = LAND_COLOR
  context.beginPath()
  path(land)
  context.fill()
}

// Draws the person centred on a square canvas of the given size, with the
// ring's outer edge at ringDiameter pixels across, as a PNG. background is
// 'none' (transparent), 'disc' (white inside the ring, transparent outside)
// or 'square' (white everywhere).
async function makeIcon(size, ringDiameter, background) {
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')

  if (background === 'square') {
    context.fillStyle = BACKGROUND_COLOR
    context.fillRect(0, 0, size, size)
  }

  const scale = ringDiameter / (2 * RING_OUTER_RADIUS)
  context.translate(size / 2, size / 2)
  context.scale(scale, scale)
  context.translate(-CENTRE, -CENTRE)

  if (background === 'disc') {
    context.fillStyle = BACKGROUND_COLOR
    context.beginPath()
    context.arc(CENTRE, CENTRE, RING_OUTER_RADIUS, 0, 2 * Math.PI)
    context.fill()
  }
  drawPerson(context)
  return canvas.encode('png')
}

// The person on a white disc as an SVG, the same shapes as drawPerson. The
// view box is cropped to the ring's outer edge.
function makeSvgIcon() {
  const path = geoPath(headProjection()).digits(SVG_DIGITS)
  const viewBoxStart = CENTRE - RING_OUTER_RADIUS
  const viewBoxSize = 2 * RING_OUTER_RADIUS
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxStart} ${viewBoxStart} ${viewBoxSize} ${viewBoxSize}">
<clipPath id="inside-ring"><circle cx="${CENTRE}" cy="${CENTRE}" r="${RING_RADIUS}"/></clipPath>
<circle cx="${CENTRE}" cy="${CENTRE}" r="${RING_OUTER_RADIUS}" fill="${BACKGROUND_COLOR}"/>
<ellipse cx="${CENTRE}" cy="${SHOULDERS_CENTRE_Y}" rx="${SHOULDERS_HALF_WIDTH}" ry="${SHOULDERS_HALF_HEIGHT}" fill="${PERSON_COLOR}" clip-path="url(#inside-ring)"/>
<circle cx="${CENTRE}" cy="${CENTRE}" r="${RING_RADIUS}" fill="none" stroke="${PERSON_COLOR}" stroke-width="${RING_WIDTH}"/>
<circle cx="${CENTRE}" cy="${HEAD_CENTRE_Y}" r="${HEAD_RADIUS}" fill="${SEA_COLOR}"/>
<path d="${path(land)}" fill="${LAND_COLOR}"/>
</svg>
`
}

for (const { folder, scale } of DENSITIES) {
  const adaptiveSize = Math.round(ADAPTIVE_LAYER_DP * scale)
  const foreground = await makeIcon(adaptiveSize, ADAPTIVE_SAFE_DIAMETER_DP * scale, 'none')
  writeFileSync(`${RESOURCES}/${folder}/ic_launcher_foreground.png`, foreground)

  const legacySize = Math.round(LEGACY_ICON_DP * scale)
  const legacy = await makeIcon(legacySize, legacySize * LEGACY_RING_FRACTION, 'disc')
  writeFileSync(`${RESOURCES}/${folder}/ic_launcher.png`, legacy)
  writeFileSync(`${RESOURCES}/${folder}/ic_launcher_round.png`, legacy)
}
console.log(`Wrote launcher icons to ${RESOURCES}/mipmap-*/`)

writeFileSync(`${WEBSITE}/favicon.svg`, makeSvgIcon())
const appleTouchIcon = await makeIcon(
  APPLE_TOUCH_ICON_SIZE,
  APPLE_TOUCH_ICON_SIZE * APPLE_TOUCH_RING_FRACTION,
  'square',
)
writeFileSync(`${WEBSITE}/apple-touch-icon.png`, appleTouchIcon)
console.log(`Wrote favicon.svg and apple-touch-icon.png to ${WEBSITE}/`)
