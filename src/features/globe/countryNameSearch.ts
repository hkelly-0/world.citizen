import {
  alternativeNames,
  compareNames,
  countryDisplayName,
  type CountryFacts,
} from '../../shared/countryFacts'
import type { CountryShape } from '../../shared/countries'
import { normalise } from '../../shared/normalise'

// Suggestions appear once this many letters are typed.
export const MIN_SEARCH_LENGTH = 3
const MAX_SUGGESTIONS = 6

// One area on the globe that the search box can find: one of the 197
// countries or a territory (e.g. Greenland, Somaliland).
export type SearchPlace = {
  name: string
  // Alternatives that also match, e.g. "Turkey" for Türkiye. Territories have none.
  otherNames: string[]
  // Index into the shapes the places were made from.
  shapeIndex: number
}

// Every area on the map as a search place, in alphabetical order so
// suggestions are listed that way. Takes the shapes as an argument so this
// file doesn't load the map data itself (the Passport editor imports it too).
export function searchPlacesFromShapes(shapes: CountryShape[]): SearchPlace[] {
  const places = shapes.map((shape, shapeIndex) => ({
    name: countryDisplayName(shape),
    otherNames: shape.isoAlpha3 === null ? [] : alternativeNames(shape.isoAlpha3),
    shapeIndex,
  }))
  return places.sort((a, b) => compareNames(a.name, b.name))
}

// The places whose name, or one of its alternatives (e.g. "Turkey" for
// Türkiye), has a word starting with the typed text, ignoring case and
// accents, e.g. "kor" finds North Korea and South Korea, and "leste" finds
// Timor-Leste. Names that start with the text come first.
// Returns nothing until MIN_SEARCH_LENGTH letters are typed.
export function searchPlaces(places: SearchPlace[], typed: string): SearchPlace[] {
  const query = normalise(typed)
  if (query.length < MIN_SEARCH_LENGTH) return []

  const nameStartMatches: SearchPlace[] = []
  const wordStartMatches: SearchPlace[] = []
  for (const place of places) {
    const match = nameMatch([place.name, ...place.otherNames], query)
    if (match === 'name-start') nameStartMatches.push(place)
    else if (match === 'word-start') wordStartMatches.push(place)
  }
  return [...nameStartMatches, ...wordStartMatches].slice(0, MAX_SUGGESTIONS)
}

// Whether the country's common name, or one of its alternatives, has a word
// starting with the typed text, ignoring case and accents, from the first
// letter typed. Empty text matches every country. Used to filter the Passport
// editor's checklist.
export function matchesCountrySearch(country: CountryFacts, typed: string): boolean {
  const query = normalise(typed)
  const names = [country.commonName, ...alternativeNames(country.isoAlpha3)]
  return query === '' || nameMatch(names, query) !== null
}

// How a place's names match `query` (already normalised): 'name-start' if
// one starts with it, 'word-start' if a later word in one does (after a space
// or hyphen), or null if neither.
function nameMatch(unnormalisedNames: string[], query: string): 'name-start' | 'word-start' | null {
  const names = unnormalisedNames.map(normalise)
  if (names.some((name) => name.startsWith(query))) return 'name-start'
  if (names.some((name) => name.includes(` ${query}`) || name.includes(`-${query}`))) {
    return 'word-start'
  }
  return null
}
