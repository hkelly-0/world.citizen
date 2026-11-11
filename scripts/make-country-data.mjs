// Builds src/data/countries.json: facts for the 193 UN members plus the two
// observer states (Vatican City and Palestine), Taiwan and Kosovo, keyed by
// ISO alpha-3 code.
// Run once from the project root; the generated file is bundled with the app.
//
// Each country's group comes from the hand-written src/data/countryGroups.json.
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
const GROUPS = 'src/data/countryGroups.json'

// UN observer states, included alongside the UN members.
const OBSERVER_STATES = ['VAT', 'PSE']

// Also included, though neither is a UN member or observer state.
const OTHER_STATES = ['TWN', 'UNK']

// Kosovo has no ISO code. mledoze calls it UNK; we use XKX instead, the code
// the UN population data (and the EU and World Bank) use for it. Progress is
// saved under it, so it must never change.
const CODES = {
  UNK: 'XKX',
}

// mledoze's area for Serbia includes Kosovo, which is now a country of its
// own here (Serbia's UN population already leaves Kosovo out). So Kosovo's
// area is taken off Serbia's.
const AREA_TAKEN_OFF = {
  SRB: 'XKX',
}

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

// Our choice of common name where it differs from mledoze's. The names
// replaced are kept as alternatives in src/data/countryNameAlternatives.json.
const COMMON_NAMES = {
  BHS: 'The Bahamas',
  CIV: "Côte d'Ivoire",
  CPV: 'Cabo Verde',
  GMB: 'The Gambia',
}

// mledoze gives Ireland's description ("Republic of Ireland") rather than its
// name, which under the constitution is just "Ireland".
const OFFICIAL_NAMES = {
  IRL: 'Ireland',
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
const selected = mledoze
  .filter(
    (country) =>
      country.unMember ||
      OBSERVER_STATES.includes(country.cca3) ||
      OTHER_STATES.includes(country.cca3),
  )
  .map((country) => ({ ...country, cca3: CODES[country.cca3] ?? country.cca3 }))
const areaOf = (code) => selected.find((country) => country.cca3 === code).area

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
const ihdiBreakdowns = {}

// --- IHDI broken down into its three inequality-adjusted dimension indices ---
// The UNDP file doesn't list these, so they are worked out as UNDP does (HDR
// technical notes): each dimension index from its indicators and fixed
// goalposts, times (1 - that dimension's inequality loss). The IHDI is the
// geometric mean of the three; this reproduces UNDP's IHDI to 3 decimals.
const LIFE_EXPECTANCY_GOALPOSTS = { min: 20, max: 85 }
const EXPECTED_SCHOOLING_MAX = 18
const MEAN_SCHOOLING_MAX = 15
const INCOME_GOALPOSTS = { min: 100, max: 75000 }
const IHDI_BREAKDOWN_TOLERANCE = 0.002

// Values from the same year as the IHDI, or null if any is missing.
function ihdiBreakdown(row, year) {
  const valueOf = (prefix) => {
    const text = row[`${prefix}_${year}`]?.trim()
    return text ? Number(text) : null
  }
  const lifeExpectancy = valueOf('le')
  const expectedSchooling = valueOf('eys')
  const meanSchooling = valueOf('mys')
  const income = valueOf('gnipc')
  const lifespanLoss = valueOf('ineq_le')
  const educationLoss = valueOf('ineq_edu')
  const incomeLoss = valueOf('ineq_inc')
  const values = [lifeExpectancy, expectedSchooling, meanSchooling, income]
  const losses = [lifespanLoss, educationLoss, incomeLoss]
  if ([...values, ...losses].includes(null)) return null

  const lifespanIndex =
    (lifeExpectancy - LIFE_EXPECTANCY_GOALPOSTS.min) /
    (LIFE_EXPECTANCY_GOALPOSTS.max - LIFE_EXPECTANCY_GOALPOSTS.min)
  const educationIndex =
    (Math.min(expectedSchooling, EXPECTED_SCHOOLING_MAX) / EXPECTED_SCHOOLING_MAX +
      Math.min(meanSchooling, MEAN_SCHOOLING_MAX) / MEAN_SCHOOLING_MAX) /
    2
  const incomeIndex =
    (Math.log(Math.min(income, INCOME_GOALPOSTS.max)) - Math.log(INCOME_GOALPOSTS.min)) /
    (Math.log(INCOME_GOALPOSTS.max) - Math.log(INCOME_GOALPOSTS.min))
  // Losses are percentages.
  const lifespan = lifespanIndex * (1 - lifespanLoss / 100)
  const education = educationIndex * (1 - educationLoss / 100)
  const incomeAdjusted = incomeIndex * (1 - incomeLoss / 100)

  // Check against UNDP's own IHDI, so a changed method in a new report is noticed.
  const ihdi = Number(row[`ihdi_${year}`])
  const rebuilt = Math.cbrt(lifespan * education * incomeAdjusted)
  if (Math.abs(rebuilt - ihdi) > IHDI_BREAKDOWN_TOLERANCE) {
    throw new Error(`IHDI breakdown for ${row.iso3} gives ${rebuilt}, not UNDP's ${ihdi}`)
  }
  const round = (value) => Math.round(value * 1000) / 1000
  return { lifespan: round(lifespan), education: round(education), income: round(incomeAdjusted) }
}

await readCsv(join(sources, 'hdr-composite.csv'), { gzipped: false, encoding: 'latin1' }, (row) => {
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
  if (ihdi !== undefined) {
    ihdis[row.iso3] = ihdi
    const breakdown = ihdiBreakdown(row, ihdi.year)
    if (breakdown !== null) ihdiBreakdowns[row.iso3] = breakdown
  }
})

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
console.log(
  `IHDI estimate: ${slope.toFixed(4)} x HDI + ${intercept.toFixed(4)} (fitted on ${bothCodes.length} countries)`,
)

// --- Country groups: every country in exactly one group of 3 to 6 ---
const groups = JSON.parse(readFileSync(GROUPS, 'utf8'))
const groupOf = {}
for (const group of groups) {
  if (group.countries.length < 3 || group.countries.length > 6) {
    throw new Error(`Group ${group.id} has ${group.countries.length} countries, not 3 to 6`)
  }
  for (const code of group.countries) {
    if (!selected.some((country) => country.cca3 === code)) {
      throw new Error(`Group ${group.id} lists ${code}, which is not one of the 197`)
    }
    if (groupOf[code] !== undefined) {
      throw new Error(`${code} is in both ${groupOf[code].id} and ${group.id}`)
    }
    groupOf[code] = group
  }
}

// --- Native names: every language's common and official name, once each ---
// mledoze keys them by language code, e.g. { ita: { common: "Italia", ... } }.
function nativeNamesOf(country) {
  const names = Object.values(country.name.native ?? {}).flatMap((name) => [
    name.common.trim(),
    name.official.trim(),
  ])
  return [...new Set(names)]
}

// --- Join on ISO alpha-3, sorted by code so diffs stay stable ---
const countries = {}
for (const country of selected.sort((a, b) => a.cca3.localeCompare(b.cca3))) {
  const code = country.cca3
  if (populations[code] === undefined) {
    throw new Error(`No ${POPULATION_YEAR} population for ${code}`)
  }
  if (groupOf[code] === undefined) {
    throw new Error(`${code} is not in any group in ${GROUPS}`)
  }
  const hdi = hdis[code] ?? null
  const ihdi = ihdis[code] ?? null

  countries[code] = {
    isoAlpha3: code,
    commonName: COMMON_NAMES[code] ?? country.name.common,
    officialName: OFFICIAL_NAMES[code] ?? country.name.official,
    // Common and official names in each official language, in its own script
    // (e.g. "Italia", "Repubblica italiana", "Россия"). Accepted as answers.
    nativeNames: nativeNamesOf(country),
    capitals: EXTRA_CAPITALS[code] ?? country.capital,
    areaKm2:
      AREA_TAKEN_OFF[code] === undefined
        ? country.area
        : country.area - areaOf(AREA_TAKEN_OFF[code]),
    population: populations[code],
    populationYear: POPULATION_YEAR,
    // Null when UNDP has no HDI for the country.
    hdi: hdi === null ? null : hdi.value,
    hdiYear: hdi === null ? null : hdi.year,
    // Null when UNDP has no IHDI for the country; shown as "no data".
    ihdi: ihdi === null ? null : ihdi.value,
    ihdiYear: ihdi === null ? null : ihdi.year,
    // The IHDI's three inequality-adjusted parts (0–1), from the same year.
    // Null when there is no IHDI or UNDP lacks a value it is worked out from.
    ihdiBreakdown: ihdiBreakdowns[code] ?? null,
    // Only for countries with an HDI but no IHDI; null otherwise.
    ihdiEstimate: hdi !== null && ihdi === null ? estimateIhdi(hdi.value) : null,
    groupId: groupOf[code].id,
    groupName: groupOf[code].name,
  }
}

writeFileSync(OUTPUT, JSON.stringify(countries, null, 2) + '\n')
const missingIhdi = Object.values(countries).filter((country) => country.ihdi === null)
console.log(`Wrote ${Object.keys(countries).length} countries to ${OUTPUT}`)
const missingHdi = Object.values(countries).filter((country) => country.hdi === null)
console.log(`No HDI for ${missingHdi.length}: ${missingHdi.map((c) => c.isoAlpha3).join(', ')}`)
console.log(`No IHDI for ${missingIhdi.length}: ${missingIhdi.map((c) => c.isoAlpha3).join(', ')}`)
const estimated = Object.values(countries).filter((country) => country.ihdiEstimate !== null)
console.log(
  `Estimated IHDI for ${estimated.length}: ${estimated.map((c) => c.isoAlpha3).join(', ')}`,
)
