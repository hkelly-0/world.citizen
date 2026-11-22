import { alternativeNames, countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { answerOption, matchAnswer, type AnswerMatch } from '../../shared/typoMatch'

// Every country with the names accepted for it: its common name, official
// name, hand-written alternatives (e.g. "Turkey" for Türkiye), and native
// names (e.g. "Italia").
const COUNTRY_NAME_OPTIONS = Object.values(countryFacts).map((country) =>
  answerOption(country.isoAlpha3, [
    country.commonName,
    country.officialName,
    ...alternativeNames(country.isoAlpha3),
    ...country.nativeNames,
  ]),
)

// The country the typed name names, and the accepted name it matched (e.g.
// "Turkey" for "turky"), ignoring case and accents and allowing a few typos
// (`matchAnswer`). Null if it names no country, or a typo is as close to two.
// No two countries share an accepted name, so at most one can match.
export function countryNameMatch(typed: string): AnswerMatch | null {
  return matchAnswer(typed, COUNTRY_NAME_OPTIONS)[0] ?? null
}

// True if the typed answer names this country (`countryNameMatch`).
export function isCountryNameCorrect(typed: string, country: CountryFacts): boolean {
  return countryNameMatch(typed)?.key === country.isoAlpha3
}
