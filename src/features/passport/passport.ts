import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import type { Discoveries } from '../../shared/discoveries'
import type { PassportSort } from '../../shared/passportSort'
import type { CountryProgress, DeckProgress, QuestionId } from '../flashcards/deck'
import { recallChance } from '../flashcards/fsrs'

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

// How well the user knows a country on `today`: the average FSRS recall chance
// (0 to 1) of its answered questions among `questionIds` (those learned in
// Settings). Null if none of them has been answered.
export function countryRecall(
  country: CountryProgress | undefined,
  questionIds: QuestionId[],
  today: string,
): number | null {
  const chances = questionIds
    .map((id) => country?.[id])
    .filter((question) => question !== undefined)
    .map((question) => recallChance(question, today))
  if (chances.length === 0) return null
  return chances.reduce((sum, chance) => sum + chance, 0) / chances.length
}

// The countries in the Passport, sorted as chosen, with ties kept A–Z.
// - 'date-discovered' puts the first discovered at the top. Countries with no
//   discovery time (seen before times were recorded) count as discovered
//   together before all the others, so they come first.
// - 'recall' puts the least likely to be remembered on `today` at the top,
//   using only `learnedQuestionIds`. Countries with none of those answered
//   have no recall chance and come last.
export function sortedCollectedCountries(
  progress: DeckProgress,
  discoveries: Discoveries,
  learnedQuestionIds: QuestionId[],
  sort: PassportSort,
  today: string,
): CountryFacts[] {
  // Already alphabetical, and sort() keeps that order between equal values.
  const countries = collectedCountries(progress)
  if (sort === 'date-discovered') {
    // '' sorts before every time.
    const discoveredAt = (country: CountryFacts) => discoveries[country.isoAlpha3] ?? ''
    return countries.sort((a, b) => discoveredAt(a).localeCompare(discoveredAt(b)))
  }
  if (sort === 'recall') {
    // Infinity sorts after every recall chance.
    const recall = (country: CountryFacts) =>
      countryRecall(progress[country.isoAlpha3], learnedQuestionIds, today) ?? Infinity
    // Infinity − Infinity is NaN, which sort() would mishandle, so equal
    // chances are compared first.
    return countries.sort((a, b) => (recall(a) === recall(b) ? 0 : recall(a) - recall(b)))
  }
  return countries
}
