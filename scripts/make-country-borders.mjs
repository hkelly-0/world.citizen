// Finds every country that shares a land border with each country and saves
// them to src/data/countryBorders.json.
//
// Only main landmasses count (src/features/globe/mainLandmass.ts), so far-off
// overseas parts don't (e.g. France doesn't border Brazil via French Guiana).
// Areas outside the 195 countries (e.g. Kosovo, Western Sahara) are left out,
// so countries that only meet through one aren't neighbours (e.g. Serbia and
// Albania).
//
// The borders come from TopoJSON, which stores each shared border once, so
// both countries' outlines have exactly the same points along it. Two
// countries border each other if their outlines share an edge (two points in
// a row); countries meeting only at a single corner point don't.
//
// The JSON has every country, each with its bordering countries in
// alphabetical order (empty for islands): { "AND": ["ESP", "FRA"], ... }.
//
// Rerun after changing the borders or the main landmass overrides.
//
// Usage: node scripts/make-country-borders.mjs
import { readFileSync, writeFileSync } from 'node:fs'
// Shared with the globe, so borders use the same parts the globe frames.
import { mainLandmass } from '../src/features/globe/mainLandmass.ts'
import { loadCountryShapes } from '../src/shared/countries.ts'

const OUTPUT = 'src/data/countryBorders.json'

const codes = Object.keys(JSON.parse(readFileSync('src/data/countries.json', 'utf8'))).sort()
const shapesByCode = new Map(loadCountryShapes().map((shape) => [shape.isoAlpha3, shape]))

// Each edge of the main landmass's outlines (holes included, so countries
// inside another, e.g. San Marino, border it), as a key that is the same
// whichever way round the edge is drawn.
function edgeKeys(code) {
  const shape = shapesByCode.get(code)
  if (shape === undefined) throw new Error(`No outline for ${code}`)
  const keys = new Set()
  for (const polygon of mainLandmass(shape.geometry, code).coordinates) {
    for (const ring of polygon) {
      for (let i = 1; i < ring.length; i++) {
        const from = ring[i - 1].join(',')
        const to = ring[i].join(',')
        keys.add(from < to ? `${from}|${to}` : `${to}|${from}`)
      }
    }
  }
  return keys
}

const edgesByCode = new Map(codes.map((code) => [code, edgeKeys(code)]))

const borders = {}
for (const code of codes) {
  const here = edgesByCode.get(code)
  borders[code] = codes.filter((other) => {
    if (other === code) return false
    for (const key of edgesByCode.get(other)) {
      if (here.has(key)) return true
    }
    return false
  })
}

// One country per line, so the file is easy to read and to diff.
const lines = codes.map((code) => `  "${code}": ${JSON.stringify(borders[code])}`)
writeFileSync(OUTPUT, `{\n${lines.join(',\n')}\n}\n`)
console.log(`Saved ${codes.length} countries' land borders to ${OUTPUT}`)
