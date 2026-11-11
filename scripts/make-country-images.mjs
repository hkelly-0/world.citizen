// Draws one square picture per country for the flashcards, saved as WebP files
// under public/country-images/. Run from the project root after
// scripts/make-background-tiles.sh; the generated images are bundled with the app.
//
// Each picture looks straight down on the globe above the country (an
// orthographic projection, so nothing is stretched). The country is filled
// with the satellite imagery from public/tiles/satellite/ and its longest side
// takes up two thirds of the picture (a bit less for smaller countries, so
// more of their surroundings show). Everything outside it is transparent: no
// other countries are drawn, only this country's outline as a thick line.
//
// Usage: node scripts/make-country-images.mjs [ISO alpha-3 codes...]
//   With no codes, draws all 197 countries.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
// Shared with the globe, so pictures and the globe frame the same parts.
// Hand-picked exceptions are in src/data/mainLandmassOverrides.json.
import { mainLandmass } from '../src/features/globe/mainLandmass.ts'
// Shared with the globe, so pictures and the globe give countries the same ISO codes.
import { loadCountryShapes, wholeCountryGeometry } from '../src/shared/countries.ts'

const OUTPUT = 'public/country-images'
const TILES = 'public/tiles/satellite'
const IMAGE_SIZE = 512
// The country's longest side, as a fraction of the picture's width. Countries
// at least LARGE_COUNTRY_KM across fill LARGE_COUNTRY_FRACTION; smaller ones
// fill less, down to SMALL_COUNTRY_FRACTION at SMALL_COUNTRY_KM and below.
const LARGE_COUNTRY_KM = 1000
const LARGE_COUNTRY_FRACTION = 2 / 3
const SMALL_COUNTRY_KM = 100
const SMALL_COUNTRY_FRACTION = 1 / 2
// Same colour as the globe's border lines (BORDER_COLOR in GlobeView.tsx), but
// thicker. The line is centred on the border, so half of it covers the country.
const BORDER_COLOR = 'rgba(255, 255, 255, 0.7)'
const BORDER_WIDTH = 5
const WEBP_QUALITY = 80

// The most detailed satellite tiles are at zoom level 6. Each tile pixel there
// covers about 2.4 km at the equator.
const MAX_TILE_ZOOM = 6
const TILE_SIZE = 256
const EARTH_RADIUS_KM = 6371
const EARTH_CIRCUMFERENCE_KM = 40075

// Zoom cap for very small countries: each satellite pixel may be enlarged to
// at most this many picture pixels. Beyond that the imagery is just blur, so
// small countries (e.g. Vatican City) are shown smaller than two thirds.
const MAX_MAGNIFICATION = 4
const MAX_KM_PER_TILE_PIXEL = EARTH_CIRCUMFERENCE_KM / (TILE_SIZE * 2 ** MAX_TILE_ZOOM)
// In d3's orthographic projection, the scale is the Earth's radius in pixels.
const MAX_SCALE = (EARTH_RADIUS_KM / MAX_KM_PER_TILE_PIXEL) * MAX_MAGNIFICATION

// --- Country outlines (same data as the globe) ---
const countryShapes = loadCountryShapes()

// --- Choosing what to frame ---

// How much of the picture's width the country's longest side should fill.
// Between the small and large sizes, each tenfold change in size changes the
// fraction by the same amount, e.g. 316 km is halfway between 100 and 1000 km.
function countryFraction(longestSideKm) {
  if (longestSideKm >= LARGE_COUNTRY_KM) return LARGE_COUNTRY_FRACTION
  if (longestSideKm <= SMALL_COUNTRY_KM) return SMALL_COUNTRY_FRACTION
  const progress =
    Math.log10(longestSideKm / SMALL_COUNTRY_KM) / Math.log10(LARGE_COUNTRY_KM / SMALL_COUNTRY_KM)
  return SMALL_COUNTRY_FRACTION + progress * (LARGE_COUNTRY_FRACTION - SMALL_COUNTRY_FRACTION)
}

// Sets the projection's scale and position so the framed area's longest side
// fills the given fraction of the picture, centred.
function fitToFraction(projection, framed, fraction) {
  const margin = (IMAGE_SIZE * (1 - fraction)) / 2
  return projection.fitExtent(
    [
      [margin, margin],
      [IMAGE_SIZE - margin, IMAGE_SIZE - margin],
    ],
    framed,
  )
}

// An orthographic projection centred on the framed area, scaled so its
// longest side fills countryFraction() of the picture (less for tiny countries).
function projectionFor(framed) {
  const projection = geoOrthographic().rotate(geoCentroid(framed).map((degrees) => -degrees))

  // Fit once at full size to measure the country, then refit for its size.
  fitToFraction(projection, framed, LARGE_COUNTRY_FRACTION)
  const longestSideKm =
    ((IMAGE_SIZE * LARGE_COUNTRY_FRACTION) / projection.scale()) * EARTH_RADIUS_KM
  fitToFraction(projection, framed, countryFraction(longestSideKm))

  if (projection.scale() > MAX_SCALE) {
    // Zoom out to the cap, then re-centre the country in the picture.
    projection.scale(MAX_SCALE).translate([IMAGE_SIZE / 2, IMAGE_SIZE / 2])
    const [[left, top], [right, bottom]] = geoPath(projection).bounds(framed)
    const [x, y] = projection.translate()
    projection.translate([
      x + IMAGE_SIZE / 2 - (left + right) / 2,
      y + IMAGE_SIZE / 2 - (top + bottom) / 2,
    ])
  }
  return projection
}

// --- Satellite tiles ---

// The least detailed tile zoom whose pixels are at least as small as the
// picture's pixels, so big countries don't load hundreds of detailed tiles.
function tileZoomFor(projection) {
  const pictureKmPerPixel = EARTH_RADIUS_KM / projection.scale()
  for (let zoom = 0; zoom < MAX_TILE_ZOOM; zoom++) {
    const tileKmPerPixel = EARTH_CIRCUMFERENCE_KM / (TILE_SIZE * 2 ** zoom)
    if (tileKmPerPixel <= pictureKmPerPixel) return zoom
  }
  return MAX_TILE_ZOOM
}

// Converts longitude/latitude to pixel coordinates on the whole Web Mercator
// world map at the given tile zoom (the layout the tiles are cut in).
function mercatorPixel([longitude, latitude], zoom) {
  const worldSize = TILE_SIZE * 2 ** zoom
  // The tiles stop at about 85° north and south.
  const clampedLatitude = Math.max(-85.0511, Math.min(85.0511, latitude))
  const latitudeRadians = (clampedLatitude * Math.PI) / 180
  const x = ((longitude + 180) / 360) * worldSize
  const y = ((1 - Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)) / Math.PI) / 2) * worldSize
  return [x, y]
}

// Loads the tiles at the given zoom and returns their pixel data, keyed by "x/y".
async function loadTiles(tileKeys, zoom) {
  const tiles = new Map()
  const canvas = createCanvas(TILE_SIZE, TILE_SIZE)
  const context = canvas.getContext('2d')
  for (const key of tileKeys) {
    const image = await loadImage(readFileSync(join(TILES, String(zoom), `${key}.webp`)))
    context.clearRect(0, 0, TILE_SIZE, TILE_SIZE)
    context.drawImage(image, 0, 0)
    tiles.set(key, context.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data)
  }
  return tiles
}

// --- Drawing ---

async function drawCountry(shape) {
  const framed = mainLandmass(shape.geometry, shape.isoAlpha3)
  const projection = projectionFor(framed)
  const path = geoPath(projection)

  // 1. A mask of the whole country (all its parts, including ones outside the
  //    frame that happen to be in view). Its edge pixels are partly opaque,
  //    which gives the picture smooth edges.
  const maskCanvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE)
  const maskContext = maskCanvas.getContext('2d')
  maskContext.beginPath()
  geoPath(projection, maskContext)(shape.geometry)
  maskContext.fillStyle = 'white'
  maskContext.fill()
  const mask = maskContext.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data

  // 2. For each pixel inside the country, find where it falls on the tiles.
  const zoom = tileZoomFor(projection)
  const tilesPerSide = 2 ** zoom
  const tilePositions = new Float64Array(IMAGE_SIZE * IMAGE_SIZE * 2).fill(NaN)
  const tileKeys = new Set()
  for (let y = 0; y < IMAGE_SIZE; y++) {
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const index = y * IMAGE_SIZE + x
      if (mask[index * 4 + 3] === 0) continue
      const lonLat = projection.invert([x + 0.5, y + 0.5])
      if (lonLat === null) continue
      // Shift by half a pixel so smoothing blends the four nearest tile pixels.
      const [tileX, tileY] = mercatorPixel(lonLat, zoom).map((value) => value - 0.5)
      tilePositions[index * 2] = tileX
      tilePositions[index * 2 + 1] = tileY
      for (const sampleX of [Math.floor(tileX), Math.floor(tileX) + 1]) {
        for (const sampleY of [Math.floor(tileY), Math.floor(tileY) + 1]) {
          tileKeys.add(tileKeyFor(sampleX, sampleY, tilesPerSide))
        }
      }
    }
  }

  // 3. Load just those tiles, then colour each pixel from them.
  const tiles = await loadTiles(tileKeys, zoom)
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE)
  const context = canvas.getContext('2d')
  const picture = context.createImageData(IMAGE_SIZE, IMAGE_SIZE)
  for (let index = 0; index < IMAGE_SIZE * IMAGE_SIZE; index++) {
    const tileX = tilePositions[index * 2]
    if (Number.isNaN(tileX)) continue
    const tileY = tilePositions[index * 2 + 1]
    const [red, green, blue] = smoothSample(tiles, tileX, tileY, tilesPerSide)
    picture.data[index * 4] = red
    picture.data[index * 4 + 1] = green
    picture.data[index * 4 + 2] = blue
    picture.data[index * 4 + 3] = mask[index * 4 + 3]
  }
  context.putImageData(picture, 0, 0)

  // 4. This country's outline on top.
  context.beginPath()
  path.context(context)(shape.geometry)
  context.strokeStyle = BORDER_COLOR
  context.lineWidth = BORDER_WIDTH
  context.stroke()

  return canvas.encode('webp', WEBP_QUALITY)
}

// The tile holding a world-map pixel, as "x/y". x wraps around the 180°
// meridian; y is kept inside the map.
function tileKeyFor(pixelX, pixelY, tilesPerSide) {
  const worldSize = TILE_SIZE * tilesPerSide
  const wrappedX = ((pixelX % worldSize) + worldSize) % worldSize
  const clampedY = Math.max(0, Math.min(worldSize - 1, pixelY))
  return `${Math.floor(wrappedX / TILE_SIZE)}/${Math.floor(clampedY / TILE_SIZE)}`
}

// The colour of one world-map pixel, as [red, green, blue].
function tilePixel(tiles, pixelX, pixelY, tilesPerSide) {
  const worldSize = TILE_SIZE * tilesPerSide
  const wrappedX = ((pixelX % worldSize) + worldSize) % worldSize
  const clampedY = Math.max(0, Math.min(worldSize - 1, pixelY))
  const data = tiles.get(tileKeyFor(pixelX, pixelY, tilesPerSide))
  const offset = ((clampedY % TILE_SIZE) * TILE_SIZE + (wrappedX % TILE_SIZE)) * 4
  return [data[offset], data[offset + 1], data[offset + 2]]
}

// Blends the four tile pixels around a position (bilinear smoothing), so
// enlarged imagery looks soft rather than blocky.
function smoothSample(tiles, tileX, tileY, tilesPerSide) {
  const left = Math.floor(tileX)
  const top = Math.floor(tileY)
  const fractionX = tileX - left
  const fractionY = tileY - top
  const topLeft = tilePixel(tiles, left, top, tilesPerSide)
  const topRight = tilePixel(tiles, left + 1, top, tilesPerSide)
  const bottomLeft = tilePixel(tiles, left, top + 1, tilesPerSide)
  const bottomRight = tilePixel(tiles, left + 1, top + 1, tilesPerSide)
  return [0, 1, 2].map((channel) => {
    const topValue = topLeft[channel] * (1 - fractionX) + topRight[channel] * fractionX
    const bottomValue = bottomLeft[channel] * (1 - fractionX) + bottomRight[channel] * fractionX
    return Math.round(topValue * (1 - fractionY) + bottomValue * fractionY)
  })
}

// --- Run ---

const countryFacts = JSON.parse(readFileSync('src/data/countries.json', 'utf8'))
const requestedCodes = process.argv.slice(2)
const codes = requestedCodes.length > 0 ? requestedCodes : Object.keys(countryFacts)

mkdirSync(OUTPUT, { recursive: true })
for (const code of codes) {
  const shape = countryShapes.find((candidate) => candidate.isoAlpha3 === code)
  if (shape === undefined) {
    // e.g. Tuvalu, which world-atlas has no outline for.
    console.log(`${code}: no outline, skipped`)
    continue
  }
  // Far-off parts (e.g. French Guiana) still count as their country here.
  const image = await drawCountry({
    isoAlpha3: code,
    geometry: wholeCountryGeometry(countryShapes, code),
  })
  writeFileSync(join(OUTPUT, `${code}.webp`), image)
  console.log(`${code}: ${Math.round(image.length / 1024)} KB`)
}
