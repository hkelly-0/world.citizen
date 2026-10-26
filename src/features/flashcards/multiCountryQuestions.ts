import { flagMatchingCountries } from './flagMatchingQuestion'
import { rankingCountries, type RankingStat } from './rankingQuestion'

// The Custom Practice questions about several Passport countries at once,
// rather than one country's card. Like Borders they aren't QuestionIds: no
// FSRS progress, review log or Settings tick. They can be practised together,
// but not alongside the country card questions.
export const MULTI_COUNTRY_QUESTION_IDS = [
  'flag-matching',
  'population-ranking',
  'area-ranking',
  'ihdi-ranking',
] as const
export type MultiCountryQuestionId = (typeof MULTI_COUNTRY_QUESTION_IDS)[number]

// The statistic each ranking question is about.
export const RANKING_STATS: Record<
  Exclude<MultiCountryQuestionId, 'flag-matching'>,
  RankingStat
> = {
  'population-ranking': 'population',
  'area-ranking': 'area',
  'ihdi-ranking': 'ihdi',
}

// One question: which kind, and its countries (for a ranking, highest first).
export type MultiCountryQuestion = { id: MultiCountryQuestionId; codes: string[] }

// The countries for a question of kind `id`, or null if the Passport can't
// make one. Flag Matching never starts from `previous`'s first country, if
// that was Flag Matching too.
function questionCountries(
  id: MultiCountryQuestionId,
  passportCodes: string[],
  previous: MultiCountryQuestion | null,
  random: () => number,
): string[] | null {
  if (id === 'flag-matching') {
    const previousFirstCode = previous?.id === 'flag-matching' ? previous.codes[0] : null
    return flagMatchingCountries(passportCodes, previousFirstCode, random)
  }
  return rankingCountries(RANKING_STATS[id], passportCodes, random)
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
