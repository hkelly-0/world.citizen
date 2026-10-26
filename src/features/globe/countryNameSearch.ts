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
    const match = nameMatch(country, query)
    if (match === 'name-start') nameStartMatches.push(country)
    else if (match === 'word-start') wordStartMatches.push(country)
  }
  return [...nameStartMatches, ...wordStartMatches].slice(0, MAX_SUGGESTIONS)
}

// Whether the country's common name, or one of its alternatives, has a word
// starting with the typed text, ignoring case and accents, from the first
// letter typed. Empty text matches every country. Used to filter the Passport
// editor's checklist.
export function matchesCountrySearch(country: CountryFacts, typed: string): boolean {
  const query = normalise(typed)
  return query === '' || nameMatch(country, query) !== null
}

// How the country's names match `query` (already normalised): 'name-start' if
// one starts with it, 'word-start' if a later word in one does (after a space
// or hyphen), or null if neither.
function nameMatch(country: CountryFacts, query: string): 'name-start' | 'word-start' | null {
  const names = [country.commonName, ...alternativeNames(country.isoAlpha3)].map(normalise)
  if (names.some((name) => name.startsWith(query))) return 'name-start'
  if (names.some((name) => name.includes(` ${query}`) || name.includes(`-${query}`))) {
    return 'word-start'
  }
  return null
}
