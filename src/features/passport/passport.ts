import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import type { Discoveries } from '../../shared/discoveries'
import type { PassportSort } from '../../shared/passportSort'
import type { CountryProgress, DeckProgress, QuestionId } from '../flashcards/deck'
import { addDays } from '../flashcards/dates'
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

// A random country not yet in the Passport (no question answered), for the
// "New country" card, as its ISO alpha-3 code. Null once all 195 are collected.
// `random` is a parameter so tests can make the choice predictable.
export function randomUnseenCountry(
  progress: DeckProgress,
  random: () => number = Math.random,
): string | null {
  const collectedCodes = collectedCountries(progress).map((country) => country.isoAlpha3)
  const unseenCodes = Object.keys(countryFacts).filter((code) => !collectedCodes.includes(code))
  if (unseenCodes.length === 0) return null
  return unseenCodes[Math.floor(random() * unseenCodes.length)]
}

// How far ahead familiarity looks. The chance of remembering on the day of a
// review is always about 100%, however it went, so it is measured this many
// days later instead, which tells a well-learned country from a shaky one.
const FAMILIARITY_DAYS_AHEAD = 14

// How well the user knows a country: the average FSRS chance (0 to 1) that
// they would still remember its answered questions among `questionIds` (those
// learned in Settings) 14 days after `today`. Null if none of them has been
// answered.
export function countryRecall(
  country: CountryProgress | undefined,
  questionIds: QuestionId[],
  today: string,
): number | null {
  const chances = questionIds
    .map((id) => country?.[id])
    .filter((question) => question !== undefined)
    .map((question) => recallChance(question, addDays(today, FAMILIARITY_DAYS_AHEAD)))
  if (chances.length === 0) return null
  return chances.reduce((sum, chance) => sum + chance, 0) / chances.length
}

// How well the user knows the countries they have seen: the average of
// `countryRecall` over every country with any of `questionIds` answered. Null
// if there are none. Used to warn before a new country (`isTooUnfamiliarForNewCountry`).
export function averageRecall(
  progress: DeckProgress,
  questionIds: QuestionId[],
  today: string,
): number | null {
  const recalls = Object.values(progress)
    .map((country) => countryRecall(country, questionIds, today))
    .filter((recall) => recall !== null)
  if (recalls.length === 0) return null
  return recalls.reduce((sum, recall) => sum + recall, 0) / recalls.length
}

// Before a new country, the user is warned if the average chance of still
// remembering the countries already seen 14 days from now (`averageRecall`) is
// below this.
const NEW_COUNTRY_WARNING_RECALL = 0.8

// The warning shown before a new country, in the flashcards and on the
// Passport's "New country" card.
export const NEW_COUNTRY_WARNING =
  "It's recommended to become familiar with the countries you've already seen before learning new ones."

// Whether to warn before a new country: the countries already seen, for
// `questionIds`, are less familiar than NEW_COUNTRY_WARNING_RECALL. Never when
// none has been seen.
export function isTooUnfamiliarForNewCountry(
  progress: DeckProgress,
  questionIds: QuestionId[],
  today: string,
): boolean {
  const recall = averageRecall(progress, questionIds, today)
  return recall !== null && recall < NEW_COUNTRY_WARNING_RECALL
}

// The countries in the Passport, sorted as chosen, with ties kept A–Z.
// - 'date-discovered' puts the first discovered at the top. Countries with no
//   discovery time (seen before times were recorded) count as discovered
//   together before all the others, so they come first.
// - 'recall' puts the least likely to be remembered 14 days after `today` at the top,
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
