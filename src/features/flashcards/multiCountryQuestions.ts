import { bordersQuestionCountry } from './bordersQuestion'
import { capitalMatchingCountries } from './capitalMatchingQuestion'
import type { QuestionId } from './deck'
import { flagMatchingCountries } from './flagMatchingQuestion'
import { orderingCountries, type OrderingStat } from './orderingQuestion'

// The questions about several Passport countries at once, rather than one
// country's card, plus Borders, which is about one country but is practiced
// with them. They aren't QuestionIds: no FSRS progress, review log, or Settings
// tick. Classic mixes them in between the cards; Custom Practice asks the
// ticked ones one after another, or, with country card questions ticked too,
// mixed in between the cards.
export const MULTI_COUNTRY_QUESTION_IDS = [
  'borders',
  'flag-matching',
  'capital-matching',
  'population-ordering',
  'area-ordering',
  'ihdi-ordering',
] as const
export type MultiCountryQuestionId = (typeof MULTI_COUNTRY_QUESTION_IDS)[number]

// Each is only offered (asked in Classic, tickable in Custom Practice) when
// this question type is learned in Settings. Borders needs none, so it is always offered.
export const LEARNED_QUESTION_NEEDED: Record<
  Exclude<MultiCountryQuestionId, 'borders'>,
  QuestionId
> = {
  'flag-matching': 'flag',
  'capital-matching': 'capital',
  'population-ordering': 'population',
  'area-ordering': 'area',
  'ihdi-ordering': 'ihdi',
}

// The multi-country questions offered when `learnedQuestionIds` are learned
// in Settings: Borders, and each other whose LEARNED_QUESTION_NEEDED is one of
// them. Classic asks all of these; Custom Practice offers them to tick.
export function offeredMultiCountryQuestionIds(
  learnedQuestionIds: QuestionId[],
): MultiCountryQuestionId[] {
  return MULTI_COUNTRY_QUESTION_IDS.filter(
    (id) => id === 'borders' || learnedQuestionIds.includes(LEARNED_QUESTION_NEEDED[id]),
  )
}

// The statistic each ordering question is about.
export const ORDERING_STATS: Record<
  Exclude<MultiCountryQuestionId, 'borders' | 'flag-matching' | 'capital-matching'>,
  OrderingStat
> = {
  'population-ordering': 'population',
  'area-ordering': 'area',
  'ihdi-ordering': 'ihdi',
}

// One question: which kind, and its countries (for an ordering, highest
// first; for Borders, just the one).
export type MultiCountryQuestion = { id: MultiCountryQuestionId; codes: string[] }

// The countries for a question of kind `id`, or null if the Passport can't
// make one. A matching question never starts from `previous`'s first country,
// and a borders question never asks about it, if that was the same kind of
// question (unless, for Borders, it is the only one possible).
function questionCountries(
  id: MultiCountryQuestionId,
  passportCodes: string[],
  previous: MultiCountryQuestion | null,
  random: () => number,
): string[] | null {
  const previousFirstCode = previous?.id === id ? previous.codes[0] : null
  if (id === 'borders') {
    const code = bordersQuestionCountry(passportCodes, previousFirstCode, random)
    return code === null ? null : [code]
  }
  if (id === 'flag-matching') {
    return flagMatchingCountries(passportCodes, previousFirstCode, random)
  }
  if (id === 'capital-matching') {
    return capitalMatchingCountries(passportCodes, previousFirstCode, random)
  }
  return orderingCountries(ORDERING_STATS[id], passportCodes, random)
}

// Whether the Passport can make a question of kind `id`. Which countries are
// picked is random, but whether there are enough of them isn't.
export function canMakeMultiCountryQuestion(
  id: MultiCountryQuestionId,
  passportCodes: string[],
): boolean {
  return questionCountries(id, passportCodes, null, Math.random) !== null
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
