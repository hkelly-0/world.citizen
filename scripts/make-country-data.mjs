// Builds src/data/countries.json: facts for the 193 UN members plus the two
// observer states (Vatican City and Palestine), keyed by ISO alpha-3 code.
// Run once from the project root; the generated file is bundled with the app.
//
// Needs Node 24+ and these three source files, saved in the folder given as
// the first argument:
//   mledoze-countries.json   Names, capitals, total area (ODbL)
//     https://raw.githubusercontent.com/mledoze/countries/master/countries.json
//   wpp-population.csv.gz    UN World Population Prospects 2024 (CC BY 3.0 IGO)
//     https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz
//   hdr-composite.csv        UNDP Human Development Report 2025 (CC BY 3.0 IGO)
//     https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv
//
// Usage: node scripts/make-country-data.mjs <source-folder>
import { createReadStream, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import { join } from 'node:path'

const OUTPUT = 'src/data/countries.json'

// UN observer states, included alongside the UN members.
const OBSERVER_STATES = ['VAT', 'PSE']

// WPP 2024 has estimates up to 2023 and projections after that; we use the
// medium-variant projection for 2025.
const POPULATION_YEAR = 2025

// mledoze lists one capital for these countries, which officially have two.
const EXTRA_CAPITALS = {
  BEN: ['Porto-Novo', 'Cotonou'],
  BOL: ['Sucre', 'La Paz'],
  CIV: ['Yamoussoukro', 'Abidjan'],
  LKA: ['Sri Jayawardenepura Kotte', 'Colombo'],
  MYS: ['Kuala Lumpur', 'Putrajaya'],
  NLD: ['Amsterdam', 'The Hague'],
  SWZ: ['Mbabane', 'Lobamba'],
}

const sources = process.argv[2]
if (!sources) {
  console.error('Usage: node scripts/make-country-data.mjs <source-folder>')
  process.exit(1)
}

// Splits one CSV line into fields. Handles quoted fields containing commas
// (e.g. "Australia and New Zealand"), which a plain split(',') would break.
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

// Reads a CSV file line by line (the population file is ~250 MB unzipped)
// and calls onRow with each row as an object keyed by the header names.
async function readCsv(path, { gzipped, encoding }, onRow) {
  let stream = createReadStream(path)
  if (gzipped) stream = stream.pipe(createGunzip())
  stream.setEncoding(encoding)

  let headers = null
  for await (const line of createInterface({ input: stream })) {
    // Strip the byte order mark some files start with.
    const fields = parseCsvLine(line.replace(/^﻿/, ''))
    if (headers === null) {
      headers = fields
      continue
    }
    const row = {}
    headers.forEach((header, index) => (row[header] = fields[index]))
    onRow(row)
  }
}

// --- Names, capitals and area ---
const mledoze = JSON.parse(readFileSync(join(sources, 'mledoze-countries.json'), 'utf8'))
const selected = mledoze.filter(
  (country) => country.unMember || OBSERVER_STATES.includes(country.cca3),
)

// --- Population (WPP values are in thousands) ---
const populations = {}
await readCsv(
  join(sources, 'wpp-population.csv.gz'),
  { gzipped: true, encoding: 'utf8' },
  (row) => {
    if (row.Variant === 'Medium' && Number(row.Time) === POPULATION_YEAR && row.ISO3_code) {
      populations[row.ISO3_code] = Math.round(Number(row.PopTotal) * 1000)
    }
  },
)

// --- HDI and inequality-adjusted HDI: the latest year with a value, per country ---
// The UNDP file is Latin-1 encoded, not UTF-8.
const hdis = {}
const ihdis = {}
await readCsv(
  join(sources, 'hdr-composite.csv'),
  { gzipped: false, encoding: 'latin1' },
  (row) => {
    const latestValue = (prefix) => {
      // Only "<prefix>_<year>" columns: the file also has e.g. "hdi_rank_2023".
      const yearColumn = new RegExp(`^${prefix}_\\d{4}$`)
      const years = Object.keys(row)
        .filter((column) => yearColumn.test(column) && row[column].trim() !== '')
        .map((column) => Number(column.slice(prefix.length + 1)))
      if (years.length === 0) return undefined
      const latestYear = Math.max(...years)
      return { value: Number(row[`${prefix}_${latestYear}`]), year: latestYear }
    }
    const hdi = latestValue('hdi')
    if (hdi !== undefined) hdis[row.iso3] = hdi
    const ihdi = latestValue('ihdi')
    if (ihdi !== undefined) ihdis[row.iso3] = ihdi
  },
)

// --- Estimated IHDI for countries that have an HDI but no IHDI ---
// IHDI is closely tied to HDI, and lower HDIs lose proportionally more to
// inequality. So fit a straight line (ordinary least squares) through the
// countries that have both, and apply it to the ones missing an IHDI.
const bothCodes = selected
  .map((country) => country.cca3)
  .filter((code) => hdis[code] !== undefined && ihdis[code] !== undefined)
const meanHdi = bothCodes.reduce((sum, code) => sum + hdis[code].value, 0) / bothCodes.length
const meanIhdi = bothCodes.reduce((sum, code) => sum + ihdis[code].value, 0) / bothCodes.length
let hdiTimesIhdi = 0
let hdiSquared = 0
for (const code of bothCodes) {
  const hdiOffset = hdis[code].value - meanHdi
  hdiTimesIhdi += hdiOffset * (ihdis[code].value - meanIhdi)
  hdiSquared += hdiOffset * hdiOffset
}
const slope = hdiTimesIhdi / hdiSquared
const intercept = meanIhdi - slope * meanHdi
function estimateIhdi(hdi) {
  return Math.round((slope * hdi + intercept) * 1000) / 1000
}
console.log(`IHDI estimate: ${slope.toFixed(4)} x HDI + ${intercept.toFixed(4)} (fitted on ${bothCodes.length} countries)`)

// --- Join on ISO alpha-3, sorted by code so diffs stay stable ---
const countries = {}
for (const country of selected.sort((a, b) => a.cca3.localeCompare(b.cca3))) {
  const code = country.cca3
  if (populations[code] === undefined) {
    throw new Error(`No ${POPULATION_YEAR} population for ${code}`)
  }
  const hdi = hdis[code] ?? null
  const ihdi = ihdis[code] ?? null

  countries[code] = {
    isoAlpha3: code,
    commonName: country.name.common,
    officialName: country.name.official,
    capitals: EXTRA_CAPITALS[code] ?? country.capital,
    areaKm2: country.area,
    population: populations[code],
    populationYear: POPULATION_YEAR,
    // Null when UNDP has no HDI for the country.
    hdi: hdi === null ? null : hdi.value,
    hdiYear: hdi === null ? null : hdi.year,
    // Null when UNDP has no IHDI for the country; shown as "no data".
    ihdi: ihdi === null ? null : ihdi.value,
    ihdiYear: ihdi === null ? null : ihdi.year,
    // Only for countries with an HDI but no IHDI; null otherwise.
    ihdiEstimate: hdi !== null && ihdi === null ? estimateIhdi(hdi.value) : null,
  }
}

writeFileSync(OUTPUT, JSON.stringify(countries, null, 2) + '\n')
const missingIhdi = Object.values(countries).filter((country) => country.ihdi === null)
console.log(`Wrote ${Object.keys(countries).length} countries to ${OUTPUT}`)
const missingHdi = Object.values(countries).filter((country) => country.hdi === null)
console.log(`No HDI for ${missingHdi.length}: ${missingHdi.map((c) => c.isoAlpha3).join(', ')}`)
console.log(`No IHDI for ${missingIhdi.length}: ${missingIhdi.map((c) => c.isoAlpha3).join(', ')}`)
const estimated = Object.values(countries).filter((country) => country.ihdiEstimate !== null)
console.log(`Estimated IHDI for ${estimated.length}: ${estimated.map((c) => c.isoAlpha3).join(', ')}`)
