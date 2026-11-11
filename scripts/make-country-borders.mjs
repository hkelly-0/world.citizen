// Finds every country that shares a land border with each country and saves
// them to src/data/countryBorders.json.
//
// Every part of a country counts, overseas ones included (e.g. France borders
// Brazil via French Guiana, which loadCountryShapes splits into a shape of its
// own with France as its partOf). Areas outside the 197 countries (e.g.
// Western Sahara, Sint Maarten) are left out, so countries that only meet
// through one aren't neighbours (e.g. Morocco and Mauritania, or the
// Netherlands and France on Saint Martin).
//
// The borders come from TopoJSON, which stores each shared border once, so
// both countries' outlines have exactly the same points along it. Two
// countries border each other if their outlines share an edge (two points in
// a row); countries meeting only at a single corner point don't.
//
// The JSON has every country, each with its bordering countries in
// alphabetical order (empty for islands): { "AND": ["ESP", "FRA"], ... }.
//
// Rerun after changing the borders.
//
// Usage: node scripts/make-country-borders.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { loadCountryShapes, wholeCountryGeometry } from '../src/shared/countries.ts'

const OUTPUT = 'src/data/countryBorders.json'

const codes = Object.keys(JSON.parse(readFileSync('src/data/countries.json', 'utf8'))).sort()
const shapes = loadCountryShapes()

// Each edge of the country's outlines (holes included, so countries inside
// another, e.g. San Marino, border it), as a key that is the same
// whichever way round the edge is drawn.
function edgeKeys(code) {
  const keys = new Set()
  for (const polygon of wholeCountryGeometry(shapes, code).coordinates) {
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
