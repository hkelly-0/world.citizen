// Builds src/data/countries.json: facts for the 193 UN members plus the two
// observer states (Vatican City and Palestine), Taiwan, and Kosovo, keyed by
// ISO alpha-3 code.
// Run once from the project root; the generated file is bundled with the app.
//
// Each country's group comes from the hand-written src/data/countryGroups.json.
// Estimated IHDIs use the nearest countries from src/data/countryNeighbours.json,
// so rerun this after that file changes.
//
// Needs Node 24+ and these three source files, saved in the folder given as
// the first argument:
//   mledoze-countries.json   Names, capitals, total area (ODbL)
//     https://raw.githubusercontent.com/mledoze/countries/master/countries.json
//   wpp-population.csv.gz    UN World Population Prospects 2024 (CC BY 3.0 IGO)
//     https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz
//   pip-median-2024.json     World Bank Poverty and Inequality Platform (CC BY 4.0),
//                            pinned to one release (PIP_RELEASE)
//     https://api.worldbank.org/pip/v1/pip?country=all&year=2024&fill_gaps=true&ppp_version=2021&release_version=20260922&format=json
//
// The UNDP file is committed (UNDP_FILE), as the IHDI figures use many of
// its columns and its link is tied to one year's report:
//   UNDP Human Development Report 2025 (CC BY 3.0 IGO)
//     https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv
//
// Usage: node scripts/make-country-data.mjs <source-folder>
import { createReadStream, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import { join } from 'node:path'

const OUTPUT = 'src/data/countries.json'
const GROUPS = 'src/data/countryGroups.json'
const NEIGHBOURS = 'src/data/countryNeighbours.json'
const UNDP_FILE = 'data-sources/hdr-composite.csv'

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

// mledoze's area and WPP's population for Somalia both include Somaliland,
// which the globe shows as a separate area with its own figures. Those
// hand-written figures are taken off Somalia's, so the two don't overlap.
const FIGURES_BY_HAND = 'src/data/territoryFiguresByHand.json'
const TERRITORY_TAKEN_OFF = {
  SOM: 'Somaliland',
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

// --- Names, capitals, and area ---
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
// Every row of the UNDP file, kept for estimating missing IHDIs and for the
// IHDI breakdown's figures.
const undpRows = {}

// --- UNDP's IHDI formula, used by the estimates below ---
// The IHDI's three inequality-adjusted dimension indices aren't in the UNDP
// file, so they are worked out as UNDP does (HDR technical notes): each
// dimension index from its indicators and fixed goalposts, times (1 - that
// dimension's inequality loss). The IHDI is the geometric mean of the three;
// this reproduces UNDP's IHDI to 3 decimals, which is checked for every country
// with an IHDI (checkIhdiFormula), so a changed method in a new report is noticed.
const LIFE_EXPECTANCY_GOALPOSTS = { min: 20, max: 85 }
const EXPECTED_SCHOOLING_MAX = 18
const MEAN_SCHOOLING_MAX = 15
const INCOME_GOALPOSTS = { min: 100, max: 75000 }
const IHDI_FORMULA_TOLERANCE = 0.002

// The breakdown's income in dollars is brought from the World Bank's 2021 PPP
// dollars to recent US prices, by the US consumer price index (CPI-U, not seasonally
// adjusted, 1982-84 = 100) from the BLS. Update CPI_RECENT by hand, from the
// latest monthly release: https://www.bls.gov/cpi/
const CPI_2021_AVERAGE = 270.97 // 2021's annual average
const CPI_RECENT = 337.511 // October 2026

// A value from the UNDP file for one year, or null if it is blank.
function undpValue(row, prefix, year) {
  const text = row[`${prefix}_${year}`]?.trim()
  return text ? Number(text) : null
}

// The HDI's three dimension indices (0–1) for one year, before any inequality
// adjustment, with the life expectancy, years of schooling, and income the
// indices are made from, or null if any indicator is missing.
function dimensionIndices(row, year) {
  const lifeExpectancy = undpValue(row, 'le', year)
  const expectedSchooling = undpValue(row, 'eys', year)
  const meanSchooling = undpValue(row, 'mys', year)
  const incomePerPerson = undpValue(row, 'gnipc', year)
  if ([lifeExpectancy, expectedSchooling, meanSchooling, incomePerPerson].includes(null))
    return null

  const lifespan =
    (lifeExpectancy - LIFE_EXPECTANCY_GOALPOSTS.min) /
    (LIFE_EXPECTANCY_GOALPOSTS.max - LIFE_EXPECTANCY_GOALPOSTS.min)
  const education =
    (Math.min(expectedSchooling, EXPECTED_SCHOOLING_MAX) / EXPECTED_SCHOOLING_MAX +
      Math.min(meanSchooling, MEAN_SCHOOLING_MAX) / MEAN_SCHOOLING_MAX) /
    2
  const income =
    (Math.log(Math.min(incomePerPerson, INCOME_GOALPOSTS.max)) - Math.log(INCOME_GOALPOSTS.min)) /
    (Math.log(INCOME_GOALPOSTS.max) - Math.log(INCOME_GOALPOSTS.min))
  return {
    lifespan,
    education,
    income,
    lifeExpectancy,
    expectedSchooling,
    meanSchooling,
    incomePerPerson,
  }
}

// UNDP's IHDI formula: each dimension index times (1 - its inequality loss),
// and the IHDI as the geometric mean of the three. Losses are percentages.
function inequalityAdjustedIhdi(indices, losses) {
  const lifespan = indices.lifespan * (1 - losses.lifespan / 100)
  const education = indices.education * (1 - losses.education / 100)
  const income = indices.income * (1 - losses.income / 100)
  return Math.cbrt(lifespan * education * income)
}

// Throws if the formula doesn't give UNDP's own IHDI for that year. Countries
// missing an indicator or loss that year are skipped.
function checkIhdiFormula(row, year) {
  const indices = dimensionIndices(row, year)
  const losses = {
    lifespan: undpValue(row, 'ineq_le', year),
    education: undpValue(row, 'ineq_edu', year),
    income: undpValue(row, 'ineq_inc', year),
  }
  if (indices === null || Object.values(losses).includes(null)) return
  const workedOut = inequalityAdjustedIhdi(indices, losses)
  const ihdi = Number(row[`ihdi_${year}`])
  if (Math.abs(workedOut - ihdi) > IHDI_FORMULA_TOLERANCE) {
    throw new Error(`IHDI formula for ${row.iso3} gives ${workedOut}, not UNDP's ${ihdi}`)
  }
}

// The latest year with a value, as { value, year }, or undefined if none.
function latestUndpValue(row, prefix) {
  // Only "<prefix>_<year>" columns: the file also has e.g. "hdi_rank_2023".
  const yearColumn = new RegExp(`^${prefix}_\\d{4}$`)
  const years = Object.keys(row)
    .filter((column) => yearColumn.test(column) && row[column].trim() !== '')
    .map((column) => Number(column.slice(prefix.length + 1)))
  if (years.length === 0) return undefined
  const latestYear = Math.max(...years)
  return { value: Number(row[`${prefix}_${latestYear}`]), year: latestYear }
}

await readCsv(UNDP_FILE, { gzipped: false, encoding: 'latin1' }, (row) => {
  undpRows[row.iso3] = row
  const hdi = latestUndpValue(row, 'hdi')
  if (hdi !== undefined) hdis[row.iso3] = hdi
  const ihdi = latestUndpValue(row, 'ihdi')
  if (ihdi !== undefined) {
    ihdis[row.iso3] = ihdi
    checkIhdiFormula(row, ihdi.year)
  }
})

// --- HDIs written by hand, for countries the UNDP file leaves out ---
// The UNDP doesn't list Kosovo or Taiwan, as neither is a UN member.
// - Kosovo: the national total from Global Data Lab's Subnational HDI
//   (v10.2), which uses the UNDP's method:
//   https://globaldatalab.org/shdi/table/shdi/XKO/
// - Taiwan: Taiwan's statistics office (DGBAS) puts its own figures into the
//   UNDP's formula and compares them against the same report as the UNDP file:
//   https://data.gov.tw/dataset/25711
// Added after the UNDP file is read and before the IHDI estimates below, so
// these countries get an estimated IHDI.
const HDI_BY_HAND = {
  XKX: { value: 0.797, year: 2023 },
  TWN: { value: 0.934, year: 2023 },
}
for (const [code, hdi] of Object.entries(HDI_BY_HAND)) {
  if (hdis[code] !== undefined) {
    throw new Error(`The UNDP file now has an HDI for ${code}; remove it from HDI_BY_HAND`)
  }
  hdis[code] = hdi
}

// --- Estimated IHDI for countries that have an HDI but no IHDI ---
// Methods were chosen by estimating the IHDI of each country that has one,
// with its own IHDI hidden (leave-one-out). Keeping a country's real
// inequality losses and estimating only the missing ones (tested on income)
// beat fitting IHDI from HDI. Only losses from the same year as a country's
// HDI count, both its own and those averaged from other countries, so an
// older loss (e.g. Equatorial Guinea's 2015 income loss) is treated as
// missing. Each country uses the first that applies:
// 1. In a comparison group (COMPARISON_GROUPS): each missing loss is the
//    average over the group countries that have it.
// 2. Missing only the income loss, and in GLOBAL_INCOME_LOSS: the average
//    income loss of every country.
// 3. Missing one or two losses: each missing loss is the average of that loss
//    over the nearest countries that have it, so the countries averaged can
//    differ between losses.
// 4. Otherwise (missing all three, or not in the UNDP file): a straight line
//    (ordinary least squares) through the nearest countries' HDIs and IHDIs.
// "Nearest" is by distance between main landmasses, from countryNeighbours.json.

// Hand-picked by economic history, for countries whose nearest countries with
// data are poor matches.
const COMPARISON_GROUPS = [
  {
    // Former British sugar colonies, now small tourism and service economies,
    // with Trinidad, Guyana, and Suriname (indentured Indian labour after
    // slavery, now oil, gas, and mining), which have no income loss of their
    // own. Haiti and the Dominican Republic are left out as poor matches.
    name: 'Caribbean',
    countries: ['ATG', 'BRB', 'DMA', 'GRD', 'GUY', 'KNA', 'LCA', 'SUR', 'TTO', 'VCT'],
  },
  {
    // Belize resembles Central America more than the islands.
    name: 'Central America',
    countries: ['BLZ', 'CRI', 'GTM', 'HND', 'NIC', 'PAN', 'SLV'],
  },
  {
    // Oil and gas states with large migrant workforces, unlike their poorer
    // neighbours. Only the UAE and Oman have an income loss; averaging the two
    // hedges against the UAE's, which is low for the region.
    name: 'Gulf',
    countries: ['ARE', 'BHR', 'KWT', 'OMN', 'QAT', 'SAU'],
  },
  {
    // Eritrea's nearest countries include the Gulf states, Jordan, and Kenya,
    // whose losses are far lower than its poorer neighbours around the Red Sea.
    name: 'Horn of Africa',
    countries: ['DJI', 'ERI', 'ETH', 'SDN', 'SOM', 'SSD', 'YEM'],
  },
  {
    // Libya's nearest countries include southern Europe across the
    // Mediterranean; it is matched with the other North African Arab states
    // instead, leaving out the poorer Sahel.
    name: 'North Africa',
    countries: ['DZA', 'EGY', 'LBY', 'MAR', 'TUN'],
  },
  {
    // Lebanon's nearest countries include Israel, Cyprus, Greece, and the
    // Caucasus, whose education losses are far lower than its Arab neighbours'.
    // Syria is left out, as it has no education loss.
    name: 'Levant',
    countries: ['EGY', 'IRQ', 'JOR', 'LBN', 'PSE'],
  },
]
// Cuba has had a planned economy since 1959, so no nearby country is a good
// match for its income inequality.
const GLOBAL_INCOME_LOSS = ['CUB']
const NEAREST_COUNT = 12

const neighbours = JSON.parse(readFileSync(NEIGHBOURS, 'utf8'))
const selectedCodes = selected.map((country) => country.cca3)
for (const code of [
  ...COMPARISON_GROUPS.flatMap((group) => group.countries),
  ...GLOBAL_INCOME_LOSS,
]) {
  if (!selectedCodes.includes(code)) throw new Error(`${code} is not one of the 197`)
}

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

// A country's loss from the same year as its HDI, or null if missing.
function lossInHdiYear(code, prefix) {
  const row = undpRows[code]
  if (row === undefined || hdis[code] === undefined) return null
  return undpValue(row, prefix, hdis[code].year)
}

// Up to NEAREST_COUNT of the nearest countries that have the data needed.
// countryNeighbours.json lists only a few more than that per country, so
// throw if too few have data for a fair average or fit.
function nearestWith(code, hasData) {
  const nearest = Object.keys(neighbours[code]).filter(hasData).slice(0, NEAREST_COUNT)
  if (nearest.length < NEAREST_COUNT / 2) {
    throw new Error(`Only ${nearest.length} nearby countries have data to estimate ${code}'s IHDI`)
  }
  return nearest
}

// Each inequality loss's part name (as in dimensionIndices) and UNDP column.
const LOSS_PARTS = [
  ['lifespan', 'ineq_le'],
  ['education', 'ineq_edu'],
  ['income', 'ineq_inc'],
]

function ihdiFromNearestFit(code) {
  const nearest = nearestWith(
    code,
    (other) => hdis[other] !== undefined && ihdis[other] !== undefined,
  )
  const meanHdi = average(nearest.map((other) => hdis[other].value))
  const meanIhdi = average(nearest.map((other) => ihdis[other].value))
  let hdiTimesIhdi = 0
  let hdiSquared = 0
  for (const other of nearest) {
    const hdiOffset = hdis[other].value - meanHdi
    hdiTimesIhdi += hdiOffset * (ihdis[other].value - meanIhdi)
    hdiSquared += hdiOffset * hdiOffset
  }
  const slope = hdiTimesIhdi / hdiSquared
  return meanIhdi + slope * (hdis[code].value - meanHdi)
}

// The estimate from a country's own dimension indices and its losses, some of
// them filled in.
function fromLosses(indices, losses, method) {
  return { value: inequalityAdjustedIhdi(indices, losses), method }
}

// Returns the estimate and a description of how it was made, for the log.
function estimateIhdi(code) {
  const row = undpRows[code]
  const year = hdis[code].year
  const indices = row === undefined ? null : dimensionIndices(row, year)
  // Losses from the HDI's year; null when missing.
  const losses = {
    lifespan: lossInHdiYear(code, 'ineq_le'),
    education: lossInHdiYear(code, 'ineq_edu'),
    income: lossInHdiYear(code, 'ineq_inc'),
  }

  // A country may supply figures to several groups (e.g. Egypt), but one being
  // estimated must have only one way to be estimated.
  const groupsOfCountry = COMPARISON_GROUPS.filter((comparison) =>
    comparison.countries.includes(code),
  )
  if (groupsOfCountry.length > 1) {
    throw new Error(`${code} is in more than one comparison group, so its estimate is unclear`)
  }
  if (groupsOfCountry.length === 1 && GLOBAL_INCOME_LOSS.includes(code)) {
    throw new Error(`${code} is in both a comparison group and GLOBAL_INCOME_LOSS`)
  }
  const group = groupsOfCountry[0]
  if (group !== undefined) {
    if (indices === null) throw new Error(`No HDI indicators for ${code} to use its group's losses`)
    const filled = []
    for (const [part, prefix] of LOSS_PARTS) {
      if (losses[part] !== null) continue
      const groupLosses = group.countries
        .map((other) => lossInHdiYear(other, prefix))
        .filter((loss) => loss !== null)
      if (groupLosses.length === 0) throw new Error(`No ${group.name} country has a ${part} loss`)
      losses[part] = average(groupLosses)
      filled.push(`${part} loss ${losses[part].toFixed(1)}%`)
    }
    return fromLosses(indices, losses, `${group.name} group's average ${filled.join(', ')}`)
  }

  const missingOnlyIncome =
    indices !== null && losses.lifespan !== null && losses.education !== null
  if (GLOBAL_INCOME_LOSS.includes(code)) {
    if (!missingOnlyIncome) throw new Error(`${code} is missing more than its income loss`)
    losses.income = average(
      selectedCodes
        .map((other) => lossInHdiYear(other, 'ineq_inc'))
        .filter((loss) => loss !== null),
    )
    return fromLosses(
      indices,
      losses,
      `every country's average income loss ${losses.income.toFixed(1)}%`,
    )
  }
  const missingParts = LOSS_PARTS.filter(([part]) => losses[part] === null)
  if (indices !== null && missingParts.length <= 2) {
    const filled = []
    for (const [part, prefix] of missingParts) {
      const nearest = nearestWith(code, (other) => lossInHdiYear(other, prefix) !== null)
      losses[part] = average(nearest.map((other) => lossInHdiYear(other, prefix)))
      filled.push(`${part} loss ${losses[part].toFixed(1)}% (nearest ${nearest.length})`)
    }
    return fromLosses(indices, losses, `nearest countries' average ${filled.join(', ')}`)
  }
  return {
    value: ihdiFromNearestFit(code),
    method: `line through nearest countries' HDI and IHDI`,
  }
}

const ihdiEstimates = {}
for (const code of selectedCodes.toSorted()) {
  if (hdis[code] === undefined || ihdis[code] !== undefined) continue
  const { value, method } = estimateIhdi(code)
  ihdiEstimates[code] = Math.round(value * 1000) / 1000
  console.log(`IHDI estimate for ${code}: ${ihdiEstimates[code]} (${method})`)
}

// --- Median income, from the World Bank, shown in the IHDI breakdown ---
// Median household income or spending (consumption) per person, as each
// country's surveys measure one or the other; spending usually comes out lower.
// The World Bank's figure for MEDIAN_INCOME_YEAR: from a survey that year,
// else moved from the surveys either side or the latest one, else (for
// countries with no survey, e.g. Saudi Arabia) the World Bank's model
// estimate, marked as estimated. Per day in 2021 PPP dollars, turned into per
// year at recent US prices (CPI_RECENT).
const PIP_RELEASE = '20260922'
const MEDIAN_INCOME_YEAR = 2024
const MODEL_ESTIMATE = 'CMD estimation'
// Argentina's survey covers only cities, so it has no national figure.
const URBAN_ONLY = ['ARG']

const medianIncomes = {}
for (const row of JSON.parse(readFileSync(join(sources, 'pip-median-2024.json'), 'utf8'))) {
  const level = URBAN_ONLY.includes(row.country_code) ? 'urban' : 'national'
  if (row.reporting_level !== level || row.median === null) continue
  if (row.reporting_year !== MEDIAN_INCOME_YEAR) {
    throw new Error(`World Bank median for ${row.country_code} is from ${row.reporting_year}`)
  }
  medianIncomes[row.country_code] = {
    dollars: Math.round(row.median * 365 * (CPI_RECENT / CPI_2021_AVERAGE)),
    isEstimated: row.estimation_type === MODEL_ESTIMATE,
  }
}

// --- The IHDI breakdown shown in the app, for real and estimated IHDIs alike ---
// None of its figures is inequality-adjusted, so none depends on how an IHDI
// was estimated:
// - lifespanYears: UNDP's (mean) life expectancy. The loss-adjusted figure (the
//   geometric mean of lifespans) was dropped, as early deaths pull it far
//   below a typical lifespan (around 34 years in Chad and Nigeria).
// - educationYears: the average of UNDP's expected and mean years of schooling
//   (uncapped, unlike the education index).
// - incomeDollars and isIncomeEstimated: the World Bank's median per year
//   (not from UNDP), and whether it is a model estimate. Every country with a
//   breakdown must have a median.
// UNDP's figures are from the IHDI's year, or for an estimate the HDI's year.
// Null when the country has neither IHDI nor estimate, or UNDP lacks one of the
// figures (e.g. Kosovo and Taiwan, which it doesn't list).
function ihdiBreakdownOf(code) {
  const year = ihdis[code]?.year ?? (ihdiEstimates[code] === undefined ? null : hdis[code].year)
  const row = undpRows[code]
  if (year === null || row === undefined) return null
  const indices = dimensionIndices(row, year)
  if (indices === null) return null
  const median = medianIncomes[code]
  if (median === undefined) {
    throw new Error(`No World Bank median income for ${code} (release ${PIP_RELEASE})`)
  }
  return {
    lifespanYears: Math.round(indices.lifeExpectancy * 10) / 10,
    educationYears: Math.round(((indices.expectedSchooling + indices.meanSchooling) / 2) * 10) / 10,
    incomeDollars: median.dollars,
    isIncomeEstimated: median.isEstimated,
  }
}

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

// --- Area and population, less any territory taken off ---
const figuresByHand = JSON.parse(readFileSync(FIGURES_BY_HAND, 'utf8'))
function areaAndPopulationOf(country) {
  const code = country.cca3
  let area =
    AREA_TAKEN_OFF[code] === undefined ? country.area : country.area - areaOf(AREA_TAKEN_OFF[code])
  let population = populations[code]
  if (TERRITORY_TAKEN_OFF[code] !== undefined) {
    const territory = figuresByHand[TERRITORY_TAKEN_OFF[code]]
    if (territory === undefined) {
      throw new Error(`${FIGURES_BY_HAND} has no ${TERRITORY_TAKEN_OFF[code]} to take off ${code}`)
    }
    area -= territory.areaKm2
    population -= territory.population
  }
  return { area, population }
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
  const { area, population } = areaAndPopulationOf(country)

  countries[code] = {
    isoAlpha3: code,
    commonName: COMMON_NAMES[code] ?? country.name.common,
    officialName: OFFICIAL_NAMES[code] ?? country.name.official,
    // Common and official names in each official language, in its own script
    // (e.g. "Italia", "Repubblica italiana", "Россия"). Accepted as answers.
    nativeNames: nativeNamesOf(country),
    capitals: EXTRA_CAPITALS[code] ?? country.capital,
    areaKm2: area,
    population: population,
    populationYear: POPULATION_YEAR,
    // Null when UNDP has no HDI for the country.
    hdi: hdi === null ? null : hdi.value,
    hdiYear: hdi === null ? null : hdi.year,
    // Null when UNDP has no IHDI for the country; shown as "no data".
    ihdi: ihdi === null ? null : ihdi.value,
    ihdiYear: ihdi === null ? null : ihdi.year,
    // Life expectancy, years of schooling, and median income, for the real or
    // estimated IHDI (see ihdiBreakdownOf).
    ihdiBreakdown: ihdiBreakdownOf(code),
    // Only for countries with an HDI but no IHDI; null otherwise.
    ihdiEstimate: ihdiEstimates[code] ?? null,
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
