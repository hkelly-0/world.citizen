// Builds src/data/territories.json: the area and population of every map area
// outside the 197 countries (e.g. Greenland, Hong Kong, French Guiana), shown
// on its info panel on the globe.
// Run once from the project root; the generated file is bundled with the app.
//
// The areas are the keys of the hand-written src/data/territorySubtitles.json,
// which has one entry per map area outside the 197: an ISO alpha-3 code, or the
// map's name for areas with none. Each figure comes from the sources below
// unless src/data/territoryFiguresByHand.json gives it, for areas the sources
// leave out or only give combined (e.g. Bonaire, Saba and Sint Eustatius).
//
// Needs Node 24+ and these two source files, the same as
// scripts/make-country-data.mjs uses, saved in the folder given as the first
// argument:
//   mledoze-countries.json   Total area (ODbL)
//     https://raw.githubusercontent.com/mledoze/countries/master/countries.json
//   wpp-population.csv.gz    UN World Population Prospects 2024 (CC BY 3.0 IGO)
//     https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz
//
// Usage: node scripts/make-territory-data.mjs <source-folder>
import { createReadStream, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import { join } from 'node:path'

const OUTPUT = 'src/data/territories.json'
const SUBTITLES = 'src/data/territorySubtitles.json'
const BY_HAND = 'src/data/territoryFiguresByHand.json'

// The same year as the countries' populations (POPULATION_YEAR in
// scripts/make-country-data.mjs): WPP's medium-variant projection.
const POPULATION_YEAR = 2025

// The far-off parts in src/data/farOffParts.json have no code on the map, so
// they are keyed by name; these are their ISO codes in the sources. Parts the
// sources don't list on their own (Easter Island, Bonaire, Saba, Sint
// Eustatius) are in territoryFiguresByHand.json instead.
const CODES_OF_FAR_OFF_PARTS = {
  'French Guiana': 'GUF',
  Guadeloupe: 'GLP',
  Martinique: 'MTQ',
  Réunion: 'REU',
  Mayotte: 'MYT',
  Tokelau: 'TKL',
}

const sources = process.argv[2]
if (!sources) {
  console.error('Usage: node scripts/make-territory-data.mjs <source-folder>')
  process.exit(1)
}

// Splits one CSV line into fields. Handles quoted fields containing commas
// (e.g. "China, Hong Kong SAR"), which a plain split(',') would break.
// A copy of the one in scripts/make-country-data.mjs.
function parseCsvLine(line) {
  const fields = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(field)
      field = ''
    } else {
      field += char
    }
  }
  fields.push(field)
  return fields
}

// --- Area ---
const mledoze = JSON.parse(readFileSync(join(sources, 'mledoze-countries.json'), 'utf8'))
const areas = {}
for (const country of mledoze) areas[country.cca3] = country.area

// --- Population (WPP values are in thousands; the file is ~250 MB unzipped) ---
const populations = {}
const stream = createReadStream(join(sources, 'wpp-population.csv.gz')).pipe(createGunzip())
stream.setEncoding('utf8')
let headers = null
for await (const line of createInterface({ input: stream })) {
  const fields = parseCsvLine(line)
  if (headers === null) {
    headers = fields
    continue
  }
  const row = {}
  headers.forEach((header, index) => (row[header] = fields[index]))
  if (row.Variant === 'Medium' && Number(row.Time) === POPULATION_YEAR && row.ISO3_code) {
    populations[row.ISO3_code] = Math.round(Number(row.PopTotal) * 1000)
  }
}

// --- Join, keyed as territorySubtitles.json is, sorted so diffs stay stable ---
const byHand = JSON.parse(readFileSync(BY_HAND, 'utf8'))
const keys = Object.keys(JSON.parse(readFileSync(SUBTITLES, 'utf8')))
for (const key of Object.keys(byHand)) {
  if (!keys.includes(key)) throw new Error(`${BY_HAND} lists ${key}, which isn't a map area`)
}

const territories = {}
for (const key of keys.sort((a, b) => a.localeCompare(b))) {
  const code = CODES_OF_FAR_OFF_PARTS[key] ?? key
  const hand = byHand[key] ?? {}
  const areaKm2 = 'areaKm2' in hand ? hand.areaKm2 : areas[code]
  // Null in the hand-written file means no permanent population.
  const population = 'population' in hand ? hand.population : populations[code]
  if (areaKm2 === undefined) throw new Error(`No area for ${key}; add it to ${BY_HAND}`)
  if (population === undefined) {
    throw new Error(`No ${POPULATION_YEAR} population for ${key}; add it to ${BY_HAND}`)
  }
  territories[key] = { areaKm2, population }
}

writeFileSync(OUTPUT, JSON.stringify(territories, null, 2) + '\n')
console.log(`Wrote ${Object.keys(territories).length} map areas to ${OUTPUT}`)
