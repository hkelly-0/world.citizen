import { countryFacts, nativeCapitalNames, type CountryFacts } from '../../shared/countryFacts'
import { answerOption, matchAnswer } from '../../shared/typoMatch'

// Every country with its capitals, in English and in the country's own
// language (e.g. "Warszawa" for Warsaw).
const CAPITAL_OPTIONS = Object.values(countryFacts).map((country) =>
  answerOption(country.isoAlpha3, [...country.capitals, ...nativeCapitalNames(country.isoAlpha3)]),
)

// The capital of this country the typed answer names, as written in the data
// (e.g. "Ouagadougou" for "ouagadougu"), ignoring case and accents and
// allowing a few typos (`matchAnswer`). Typos are checked against every
// country's capitals, so one as close to another capital is wrong. Null if
// the answer isn't one of this country's capitals.
export function matchedCapital(typed: string, country: CountryFacts): string | null {
  const match = matchAnswer(typed, CAPITAL_OPTIONS).find(({ key }) => key === country.isoAlpha3)
  return match?.name ?? null
}

// True if the typed answer is any one of the country's capitals (`matchedCapital`).
export function isCapitalCorrect(typed: string, country: CountryFacts): boolean {
  return matchedCapital(typed, country) !== null
}
