import { capitalMatchingCountries } from './capitalMatchingQuestion'
import type { QuestionId } from './deck'
import { flagMatchingCountries } from './flagMatchingQuestion'
import { orderingCountries, type OrderingStat } from './orderingQuestion'

// The Custom Practice questions about several Passport countries at once,
// rather than one country's card. Like Borders they aren't QuestionIds: no
// FSRS progress, review log or Settings tick. They can be practised together,
// but not alongside the country card questions.
export const MULTI_COUNTRY_QUESTION_IDS = [
  'flag-matching',
  'capital-matching',
  'population-ordering',
  'area-ordering',
  'ihdi-ordering',
] as const
export type MultiCountryQuestionId = (typeof MULTI_COUNTRY_QUESTION_IDS)[number]

// Each is only offered in Custom Practice when this question type is learned
// in Settings.
export const LEARNED_QUESTION_NEEDED: Record<MultiCountryQuestionId, QuestionId> = {
  'flag-matching': 'flag',
  'capital-matching': 'capital',
  'population-ordering': 'population',
  'area-ordering': 'area',
  'ihdi-ordering': 'ihdi',
}

// The statistic each ordering question is about.
export const ORDERING_STATS: Record<
  Exclude<MultiCountryQuestionId, 'flag-matching' | 'capital-matching'>,
  OrderingStat
> = {
  'population-ordering': 'population',
  'area-ordering': 'area',
  'ihdi-ordering': 'ihdi',
}

// One question: which kind, and its countries (for an ordering, highest first).
export type MultiCountryQuestion = { id: MultiCountryQuestionId; codes: string[] }

// The countries for a question of kind `id`, or null if the Passport can't
// make one. A matching question never starts from `previous`'s first country,
// if that was the same kind of question.
function questionCountries(
  id: MultiCountryQuestionId,
  passportCodes: string[],
  previous: MultiCountryQuestion | null,
  random: () => number,
): string[] | null {
  const previousFirstCode = previous?.id === id ? previous.codes[0] : null
  if (id === 'flag-matching') {
    return flagMatchingCountries(passportCodes, previousFirstCode, random)
  }
  if (id === 'capital-matching') {
    return capitalMatchingCountries(passportCodes, previousFirstCode, random)
  }
  return orderingCountries(ORDERING_STATS[id], passportCodes, random)
}

// The next question: one of the kinds in `ids` that the Passport can make, at
// random, but not the same kind as `previous` unless it is the only one. Null
// when the Passport can't make any of them. `random` is a parameter so tests
// can make the choice predictable.
export function nextMultiCountryQuestion(
  ids: MultiCountryQuestionId[],
  passportCodes: string[],
  previous: MultiCountryQuestion | null,
  random: () => number = Math.random,
): MultiCountryQuestion | null {
  const possible: MultiCountryQuestion[] = []
  for (const id of ids) {
    const codes = questionCountries(id, passportCodes, previous, random)
    if (codes !== null) possible.push({ id, codes })
  }
  const notRepeated = possible.filter((question) => question.id !== previous?.id)
  const choices = notRepeated.length > 0 ? notRepeated : possible
  if (choices.length === 0) return null
  return choices[Math.floor(random() * choices.length)]
}
