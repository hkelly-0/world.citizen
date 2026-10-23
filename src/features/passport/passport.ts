import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import type { Discoveries } from '../../shared/discoveries'
import type { PassportSort } from '../../shared/passportSort'
import type { CountryProgress, DeckProgress, QuestionId } from '../flashcards/deck'

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

// How easy the user finds a country: the average SM-2 ease factor of its
// answered questions among `questionIds` (those learned in Settings). Lower is
// harder. Null if none of them has been answered.
export function countryEase(
  country: CountryProgress | undefined,
  questionIds: QuestionId[],
): number | null {
  const easeFactors = questionIds
    .map((id) => country?.[id]?.easeFactor)
    .filter((easeFactor) => easeFactor !== undefined)
  if (easeFactors.length === 0) return null
  return easeFactors.reduce((sum, easeFactor) => sum + easeFactor, 0) / easeFactors.length
}

// The countries in the Passport, sorted as chosen, with ties kept A–Z.
// - 'date-discovered' puts the first discovered at the top. Countries with no
//   discovery time (seen before times were recorded) count as discovered
//   together before all the others, so they come first.
// - 'ease' puts the hardest at the top, using only `learnedQuestionIds`.
//   Countries with none of those answered have no ease and come last.
export function sortedCollectedCountries(
  progress: DeckProgress,
  discoveries: Discoveries,
  learnedQuestionIds: QuestionId[],
  sort: PassportSort,
): CountryFacts[] {
  // Already alphabetical, and sort() keeps that order between equal values.
  const countries = collectedCountries(progress)
  if (sort === 'date-discovered') {
    // '' sorts before every time.
    const discoveredAt = (country: CountryFacts) => discoveries[country.isoAlpha3] ?? ''
    return countries.sort((a, b) => discoveredAt(a).localeCompare(discoveredAt(b)))
  }
  if (sort === 'ease') {
    // Infinity sorts after every ease.
    const ease = (country: CountryFacts) =>
      countryEase(progress[country.isoAlpha3], learnedQuestionIds) ?? Infinity
    // Infinity − Infinity is NaN, which sort() would mishandle, so equal eases
    // are compared first.
    return countries.sort((a, b) => (ease(a) === ease(b) ? 0 : ease(a) - ease(b)))
  }
  return countries
}
