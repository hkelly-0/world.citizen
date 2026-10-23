import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import type { Discoveries } from '../../shared/discoveries'
import type { PassportSort } from '../../shared/passportSort'
import type { DeckProgress } from '../flashcards/deck'

// How many countries there are to collect: the 195.
export const COUNTRY_COUNT = Object.keys(countryFacts).length

// The countries in the Passport: those with at least one flashcard question
// answered (in Classic or Custom Practice), in alphabetical order.
export function collectedCountries(progress: DeckProgress): CountryFacts[] {
  return Object.values(countryFacts)
    .filter((country) => {
      const questions = progress[country.isoAlpha3]
      return questions !== undefined && Object.keys(questions).length > 0
    })
    .sort((a, b) => a.commonName.localeCompare(b.commonName))
}

// The countries in the Passport, sorted as chosen. 'date-discovered' puts the
// first discovered at the top. Countries with no discovery time (seen before
// times were recorded) count as discovered together before all the others, so
// they come first, alphabetically.
export function sortedCollectedCountries(
  progress: DeckProgress,
  discoveries: Discoveries,
  sort: PassportSort,
): CountryFacts[] {
  // Already alphabetical, and sort() keeps that order between equal times.
  const countries = collectedCountries(progress)
  if (sort === 'alphabetical') return countries
  // '' sorts before every time.
  const discoveredAt = (country: CountryFacts) => discoveries[country.isoAlpha3] ?? ''
  return countries.sort((a, b) => discoveredAt(a).localeCompare(discoveredAt(b)))
}
