// Finds each country's nearest other countries and saves them to
// src/data/countryNeighbours.json.
//
// Two countries' distance is the shortest distance along the globe between
// their main landmasses (src/features/globe/mainLandmass.ts), so far-off
// overseas parts (e.g. French Guiana for France) don't count. It is measured
// between the outlines' points, so countries sharing a border are 0 km apart
// and others are at most a few km off. Countries at the same distance (e.g.
// several bordering ones) are ordered by the distance between their main
// landmasses' centres.
//
// The JSON has every country, each with its NEIGHBOURS_KEPT nearest others
// and their distance in whole km, nearest first:
// { "FRA": { "AND": 0, "BEL": 0, ... }, ... }.
//
// Rerun after changing the borders or the main landmass overrides.
//
// Usage: node scripts/make-country-neighbours.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { geoCentroid, geoDistance } from 'd3-geo'
// Shared with the globe, so distances use the same parts the globe frames.
import { mainLandmass } from '../src/features/globe/mainLandmass.ts'
import { loadCountryShapes } from '../src/shared/countries.ts'

const OUTPUT = 'src/data/countryNeighbours.json'

// How many of each country's nearest others are saved.
const NEIGHBOURS_KEPT = 10

const EARTH_RADIUS_KM = 6371
const DEGREES_TO_RADIANS = Math.PI / 180

const codes = Object.keys(JSON.parse(readFileSync('src/data/countries.json', 'utf8'))).sort()
const shapesByCode = new Map(loadCountryShapes().map((shape) => [shape.isoAlpha3, shape]))

// Each country's main landmass as every outline point (holes included, so
// countries inside another, e.g. San Marino, touch its outline), plus a circle
// around them: the centre and the furthest point's distance from it.
const landmasses = {}
for (const code of codes) {
  const shape = shapesByCode.get(code)
  if (shape === undefined) throw new Error(`No outline for ${code}`)
  const landmass = mainLandmass(shape.geometry, code)
  const points = landmass.coordinates.flat(2)
  const centre = geoCentroid(landmass)
  const radius = Math.max(...points.map((point) => geoDistance(centre, point)))
  landmasses[code] = { points: toUnitVectors(points), centre, radius }
}

// Points as x, y, z on a globe of radius 1, one after another in one array,
// so distances can be compared without trigonometry in the inner loop.
function toUnitVectors(points) {
  const vectors = new Float64Array(points.length * 3)
  points.forEach(([longitude, latitude], i) => {
    const lng = longitude * DEGREES_TO_RADIANS
    const lat = latitude * DEGREES_TO_RADIANS
    vectors[i * 3] = Math.cos(lat) * Math.cos(lng)
    vectors[i * 3 + 1] = Math.cos(lat) * Math.sin(lng)
    vectors[i * 3 + 2] = Math.sin(lat)
  })
  return vectors
}

// Shortest distance in km between two countries' outline points. The
// straight-line (chord) distance through the globe grows with the distance
// along it, so the closest pair is found by chord and converted at the end.
function landmassDistanceKm(a, b) {
  let closestSquared = Infinity
  for (let i = 0; i < a.length; i += 3) {
    for (let j = 0; j < b.length; j += 3) {
      const dx = a[i] - b[j]
      const dy = a[i + 1] - b[j + 1]
      const dz = a[i + 2] - b[j + 2]
      const squared = dx * dx + dy * dy + dz * dz
      if (squared < closestSquared) closestSquared = squared
    }
  }
  const chord = Math.sqrt(closestSquared)
  return 2 * Math.asin(Math.min(1, chord / 2)) * EARTH_RADIUS_KM
}

// Comparing every point of every pair would take too long (Russia alone has
// thousands of points). Two countries can't be closer than the distance
// between their circles' edges, so each country checks others in order of
// that lower bound and stops once no unchecked one could beat its
// NEIGHBOURS_KEPT-th nearest so far.
const neighbours = {}
for (const code of codes) {
  const here = landmasses[code]
  const candidates = codes
    .filter((other) => other !== code)
    .map((other) => {
      const there = landmasses[other]
      const centreDistance = geoDistance(here.centre, there.centre)
      const edgeGap = centreDistance - here.radius - there.radius
      return {
        other,
        lowerBoundKm: Math.max(0, edgeGap) * EARTH_RADIUS_KM,
        centreKm: centreDistance * EARTH_RADIUS_KM,
      }
    })
    .sort((a, b) => a.lowerBoundKm - b.lowerBoundKm)

  // Distances are kept unrounded until saved, so only countries at exactly
  // the same distance (bordering ones, at 0 km) fall back to their centres.
  const nearest = []
  for (const { other, lowerBoundKm, centreKm } of candidates) {
    const isFull = nearest.length >= NEIGHBOURS_KEPT
    if (isFull && lowerBoundKm > nearest[NEIGHBOURS_KEPT - 1].km) break
    const km = landmassDistanceKm(here.points, landmasses[other].points)
    nearest.push({ other, km, centreKm })
    nearest.sort((a, b) => a.km - b.km || a.centreKm - b.centreKm)
    nearest.length = Math.min(nearest.length, NEIGHBOURS_KEPT)
  }
  neighbours[code] = Object.fromEntries(nearest.map(({ other, km }) => [other, Math.round(km)]))
}

// One country per line, so the file is easy to read and to diff.
const lines = codes.map((code) => `  "${code}": ${JSON.stringify(neighbours[code])}`)
writeFileSync(OUTPUT, `{\n${lines.join(',\n')}\n}\n`)
console.log(`Saved ${codes.length} countries' nearest neighbours to ${OUTPUT}`)
