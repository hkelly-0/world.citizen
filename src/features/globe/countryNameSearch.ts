import { alternativeNames, countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { normalise } from '../../shared/normalise'

// Suggestions appear once this many letters are typed.
export const MIN_SEARCH_LENGTH = 3
const MAX_SUGGESTIONS = 6

// The 195 countries in alphabetical order, so suggestions are listed that way.
const COUNTRIES_BY_NAME = Object.values(countryFacts).sort((a, b) =>
  a.commonName.localeCompare(b.commonName),
)

// The countries whose common name, or one of its alternatives (e.g. "Turkey"
// for Türkiye), has a word starting with the typed text, ignoring case and
// accents, e.g. "kor" finds North Korea and South Korea, and "leste" finds
// Timor-Leste. Names that start with the text come first.
// Returns nothing until MIN_SEARCH_LENGTH letters are typed.
export function searchCountries(typed: string): CountryFacts[] {
  const query = normalise(typed)
  if (query.length < MIN_SEARCH_LENGTH) return []

  const nameStartMatches: CountryFacts[] = []
  const wordStartMatches: CountryFacts[] = []
  for (const country of COUNTRIES_BY_NAME) {
    const names = [country.commonName, ...alternativeNames(country.isoAlpha3)].map(normalise)
    if (names.some((name) => name.startsWith(query))) {
      nameStartMatches.push(country)
    } else if (names.some((name) => name.includes(` ${query}`) || name.includes(`-${query}`))) {
      wordStartMatches.push(country)
    }
  }
  return [...nameStartMatches, ...wordStartMatches].slice(0, MAX_SUGGESTIONS)
}
