// Downloads one SVG flag per country into public/flags/{ISO alpha-3}.svg.
// The generated files are committed and bundled with the app.
//
// Source: https://github.com/hampusborgos/country-flags (public domain, taken
// from Wikipedia). Its flags keep their real proportions (e.g. Switzerland is
// square, Nepal isn't a rectangle). Files there are named by lowercase ISO
// alpha-2 code, e.g. https://raw.githubusercontent.com/hampusborgos/country-flags/<commit>/svg/fr.svg
// SOURCE_COMMIT pins the version, so reruns give the same files; change it to update.
//
// The files are saved as downloaded. They are already compressed upstream;
// SVGO saved only ~4% more, and rounding coordinates further visibly distorted
// detailed flags (e.g. Nepal, Afghanistan).
//
// Usage: node scripts/make-flags.mjs [ISO alpha-3 codes...]
//   With no codes, downloads all 195 countries.
import { mkdirSync, writeFileSync } from 'node:fs'
import isoCountries from 'i18n-iso-countries'
import countries from '../src/data/countries.json' with { type: 'json' }

const OUTPUT = 'public/flags'
const SOURCE_COMMIT = 'c09927e63705529bbf59ca6684cd9b23225dddad'
const SOURCE_URL = `https://raw.githubusercontent.com/hampusborgos/country-flags/${SOURCE_COMMIT}/svg`

const requestedCodes = process.argv.slice(2)
const codes = requestedCodes.length > 0 ? requestedCodes : Object.keys(countries)

mkdirSync(OUTPUT, { recursive: true })
for (const isoAlpha3 of codes) {
  if (countries[isoAlpha3] === undefined)
    throw new Error(`${isoAlpha3} is not one of the 195 countries`)
  const isoAlpha2 = isoCountries.alpha3ToAlpha2(isoAlpha3)
  if (isoAlpha2 === undefined) throw new Error(`No ISO alpha-2 code for ${isoAlpha3}`)

  const url = `${SOURCE_URL}/${isoAlpha2.toLowerCase()}.svg`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${isoAlpha3}: ${response.status} from ${url}`)
  const svg = await response.text()
  if (!svg.includes('<svg')) throw new Error(`${isoAlpha3}: ${url} is not an SVG`)

  writeFileSync(`${OUTPUT}/${isoAlpha3}.svg`, svg)
  console.log(`${isoAlpha3}: ${(svg.length / 1024).toFixed(1)} KB`)
}
