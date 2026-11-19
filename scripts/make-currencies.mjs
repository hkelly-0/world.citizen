// Builds src/data/currencies.json: every currency used by the 197 countries
// that has a recent PPP conversion factor, offered in Settings for showing the
// IHDI breakdown's income, and the currency chosen by default for each
// country's region code (from the device's locale).
// Run once from the project root; the generated file is bundled with the app.
//
// The income is in PPP dollars (US prices), so it is converted with each
// currency's PPP conversion factor (local currency per PPP dollar): what that
// income buys, priced in the currency's own country.
//
// Needs Node 24+ (for its full set of currency symbols) and these three source
// files, saved in the folder given as the first argument:
//   mledoze-countries.json   Each country's currencies and their names (ODbL),
//                            the same file as scripts/make-country-data.mjs uses
//     https://raw.githubusercontent.com/mledoze/countries/master/countries.json
//   worldbank-ppp.json       World Bank, PPP conversion factor, GDP (LCU per
//                            international $), PA.NUS.PPP (CC BY 4.0)
//     https://api.worldbank.org/v2/country/all/indicator/PA.NUS.PPP?format=json&per_page=20000&date=2020:2030
//   worldbank-gdp-ppp.json   World Bank, GDP, PPP (current international $),
//                            NY.GDP.MKTP.PP.CD (CC BY 4.0), to weight the
//                            members of a monetary union
//     https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.PP.CD?format=json&per_page=20000&date=2020:2030
//
// Usage: node scripts/make-currencies.mjs <source-folder>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT = 'src/data/currencies.json'
const COUNTRIES = 'src/data/countries.json'

// Factors from before this year are left out, with their currency: high
// inflation since (e.g. South Sudan, Syria) would make them far off.
const OLDEST_FACTOR_YEAR = 2024

// Kosovo has no ISO code. mledoze calls it UNK; we use XKX, as the World Bank
// does (see CODES in scripts/make-country-data.mjs).
const CODES = { UNK: 'XKX' }

// mledoze lists every currency Zimbabwe accepts (US dollar, rand, euro, ...),
// so only its own currency is counted for it.
const CURRENCIES_BY_HAND = { ZWE: ['ZWG'] }

// A currency used by several countries takes the factor of the country that
// issues it, e.g. the US dollar the United States' (exactly 1), not
// Ecuador's or Panama's.
const ISSUERS = {
  USD: 'USA',
  AUD: 'AUS',
  ZAR: 'ZAF',
  INR: 'IND',
  SGD: 'SGP',
  CHF: 'CHE',
  EGP: 'EGY',
  ILS: 'ISR',
  JOD: 'JOR',
}

// Monetary unions, with no single issuing country: their factor is the
// average of their members' factors, weighted by GDP (PPP), which is the
// union's total GDP in its own currency over its total GDP in PPP dollars.
// Members are every country here using the currency.
const MONETARY_UNIONS = ['EUR', 'XOF', 'XAF', 'XCD']

const sources = process.argv[2]
if (!sources) {
  console.error('Usage: node scripts/make-currencies.mjs <source-folder>')
  process.exit(1)
}

// A World Bank file's rows. Its JSON is [page info, rows].
function worldBankRows(file) {
  const [, rows] = JSON.parse(readFileSync(join(sources, file), 'utf8'))
  return rows
}
const factorRows = worldBankRows('worldbank-ppp.json')
const gdpRows = worldBankRows('worldbank-gdp-ppp.json')

// The latest year with a value for each country, as { year, value }, by ISO
// alpha-3 code.
function latestWorldBankValues(rows) {
  const latest = {}
  for (const row of rows) {
    if (row.value === null || row.countryiso3code === '') continue
    const year = Number(row.date)
    const code = row.countryiso3code
    if (latest[code] === undefined || year > latest[code].year) {
      latest[code] = { year, value: row.value }
    }
  }
  return latest
}

// A country's value for one year, or undefined if the World Bank has none.
function worldBankValue(rows, code, year) {
  const row = rows.find(
    (other) =>
      other.countryiso3code === code && Number(other.date) === year && other.value !== null,
  )
  return row?.value
}

const factors = latestWorldBankValues(factorRows)

// A country's factor, or undefined if it has none from OLDEST_FACTOR_YEAR on.
function recentFactor(code) {
  const factor = factors[code]
  if (factor === undefined || factor.year < OLDEST_FACTOR_YEAR) return undefined
  return factor
}

// --- Each of the 197 countries' currencies, in mledoze's order ---
const ourCodes = Object.keys(JSON.parse(readFileSync(COUNTRIES, 'utf8')))
const mledoze = JSON.parse(readFileSync(join(sources, 'mledoze-countries.json'), 'utf8'))
const countries = mledoze
  .map((country) => ({ ...country, cca3: CODES[country.cca3] ?? country.cca3 }))
  .filter((country) => ourCodes.includes(country.cca3))
if (countries.length !== ourCodes.length) {
  throw new Error(`Found ${countries.length} of the ${ourCodes.length} countries in mledoze`)
}

// The countries using each currency, by ISO 4217 code, and each currency's
// name as mledoze gives it for the first of them.
const usersOf = {}
const nameOf = {}
for (const country of countries) {
  const currencies = CURRENCIES_BY_HAND[country.cca3] ?? Object.keys(country.currencies ?? {})
  for (const code of currencies) {
    usersOf[code] ??= []
    usersOf[code].push(country.cca3)
    nameOf[code] ??= country.currencies[code].name
  }
}

// --- Each currency's factor ---
// Undefined when there's no recent factor (the currency is then left out).
function currencyFactor(code) {
  const users = usersOf[code]
  if (MONETARY_UNIONS.includes(code)) {
    let gdpInCurrency = 0
    let gdpInPppDollars = 0
    for (const member of users) {
      const factor = recentFactor(member)
      // Members with no recent factor (e.g. Monaco, Vatican City) are left out.
      if (factor === undefined) continue
      const gdp = worldBankValue(gdpRows, member, factor.year)
      if (gdp === undefined) continue
      gdpInCurrency += gdp * factor.value
      gdpInPppDollars += gdp
    }
    return gdpInPppDollars === 0 ? undefined : gdpInCurrency / gdpInPppDollars
  }
  if (users.length > 1 && ISSUERS[code] === undefined) {
    throw new Error(`${code} is used by ${users.join(', ')}: add it to ISSUERS or MONETARY_UNIONS`)
  }
  return recentFactor(ISSUERS[code] ?? users[0])?.value
}

// The currency's symbol in English, from Node's Unicode CLDR data: e.g. "$",
// "CA$", "€", or the ISO code itself where English has no symbol ("NGN").
// CLDR's narrow no-break space (in "F CFA") is made an ordinary no-break
// space, as Roboto Mono has no narrow one. Any other character outside Roboto
// Mono must be added to scripts/make-symbol-fonts.mjs.
function symbolOf(code) {
  const parts = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'symbol',
  }).formatToParts(1)
  return parts.find((part) => part.type === 'currency').value.replaceAll('\u202f', '\u00a0')
}

const currencies = []
for (const code of Object.keys(usersOf)) {
  const factor = currencyFactor(code)
  if (factor === undefined) {
    console.log(
      `Left out ${code} (${usersOf[code].join(', ')}): no factor since ${OLDEST_FACTOR_YEAR}`,
    )
    continue
  }
  currencies.push({
    code,
    name: nameOf[code],
    symbol: symbolOf(code),
    pppFactor: Number(factor.toPrecision(4)),
  })
}
currencies.sort((a, b) => a.name.localeCompare(b.name))

// --- The default currency for each country's region code (ISO alpha-2) ---
// The first of the country's currencies that is offered, unless
// DEFAULTS_BY_HAND gives one. Countries with none (e.g. Taiwan) are left out,
// and get the app's fallback.
// mledoze lists Palestine's currencies alphabetically, so the Egyptian pound
// would come first; the shekel is the one most used there.
const DEFAULTS_BY_HAND = { PSE: 'ILS' }
const offered = currencies.map((currency) => currency.code)
const defaultByRegion = {}
for (const country of countries) {
  const currencies = CURRENCIES_BY_HAND[country.cca3] ?? Object.keys(country.currencies ?? {})
  const first = DEFAULTS_BY_HAND[country.cca3] ?? currencies.find((code) => offered.includes(code))
  if (first !== undefined) defaultByRegion[country.cca2] = first
}

writeFileSync(OUTPUT, JSON.stringify({ currencies, defaultByRegion }, null, 2) + '\n')
console.log(`Wrote ${currencies.length} currencies to ${OUTPUT}`)
