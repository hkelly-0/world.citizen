import { addDays } from './dates'
import type { CountryProgress, QuestionId } from './deck'
import { recallChance, type QuestionProgress } from './fsrs'

// How far ahead familiarity looks. The chance of remembering on the day of a
// review is always about 100%, however it went, so it is measured this many
// days later instead, which tells a well-learned country from a shaky one.
const FAMILIARITY_DAYS_AHEAD = 14

// How much of the gap to 100% a right answer today closes, as a bonus on top of
// FSRS (see `questionFamiliarity`).
const PRACTISED_TODAY_BONUS = 0.4

// How well the user knows one question, from 0 to 1: the FSRS chance of still
// remembering it 14 days after `today`. While its latest answer is a right one
// given today after the day's first (`latestRepeatAnswer`), a bonus closes
// PRACTISED_TODAY_BONUS of the gap to 100%, so practising again on a day shows
// (FSRS only counts the first answer of a day, see `reviewQuestion`). The
// bonus is gone tomorrow, or after a close or wrong answer today.
export function questionFamiliarity(question: QuestionProgress, today: string): number {
  const chance = recallChance(question, addDays(today, FAMILIARITY_DAYS_AHEAD))
  const repeat = question.latestRepeatAnswer
  const isRightAgainToday = repeat?.date === today && repeat.result === 'right'
  return isRightAgainToday ? chance + (1 - chance) * PRACTISED_TODAY_BONUS : chance
}

// How well the user knows a country: the average `questionFamiliarity` of its
// answered questions among `questionIds` (those learned in Settings). Null if
// none of them has been answered.
export function countryRecall(
  country: CountryProgress | undefined,
  questionIds: QuestionId[],
  today: string,
): number | null {
  const chances = questionIds
    .map((id) => country?.[id])
    .filter((question) => question !== undefined)
    .map((question) => questionFamiliarity(question, today))
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
    return questionFamiliarity(question, today)
  })
  return chances.reduce((sum, chance) => sum + chance, 0) / chances.length
}
