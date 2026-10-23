import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
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
