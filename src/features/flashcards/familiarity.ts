import { addDays } from './dates'
import type { CountryProgress, DeckProgress, QuestionId } from './deck'
import { recallChance } from './fsrs'

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

// How well the user knows a country, for picking which country's flashcard
// comes next: like `countryRecall`, but every question in `questionIds` (those
// being practised) counts, with 0 for one never answered, so a country with a
// practised question still to learn comes up more often.
export function pickingFamiliarity(
  country: CountryProgress | undefined,
  questionIds: QuestionId[],
  today: string,
): number {
  if (questionIds.length === 0) return 0
  const chances = questionIds.map((id) => {
    const question = country?.[id]
    if (question === undefined) return 0
    return recallChance(question, addDays(today, FAMILIARITY_DAYS_AHEAD))
  })
  return chances.reduce((sum, chance) => sum + chance, 0) / chances.length
}

// How well the user knows the countries they have seen: the average of
// `countryRecall` over every country with any of `questionIds` answered. Null
// if there are none. Used to decide when to show a new country
// (`isTooUnfamiliarForNewCountry`).
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
