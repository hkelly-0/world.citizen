import { reviewQuestion, type AnswerResult, type QuestionProgress } from './fsrs'
import { pickingFamiliarity } from './familiarity'
import type { CountryInfo } from '../../shared/countryInfo'

// The info questions: one per paragraph in src/data/countryInfo/{ISO}.md,
// named like the sections of CountryInfo. The user reads the paragraph and
// rates how well they remembered it.
export type InfoQuestionId = keyof CountryInfo
export const INFO_QUESTION_IDS: InfoQuestionId[] = [
  'history',
  'people',
  'economy',
  'internationalRelations',
]

// The questions asked about each country, in the order they're asked: the
// facts, then the info questions. Each has its own FSRS progress, so e.g. a
// country's capital can be well known while its population isn't.
export type QuestionId =
  'globe' | 'flag' | 'area' | 'population' | 'ihdi' | 'capital' | InfoQuestionId
export const QUESTION_IDS: QuestionId[] = [
  'globe',
  'flag',
  'area',
  'population',
  'ihdi',
  'capital',
  ...INFO_QUESTION_IDS,
]

export function isInfoQuestion(id: QuestionId): id is InfoQuestionId {
  return (INFO_QUESTION_IDS as QuestionId[]).includes(id)
}

// The two ways the 'globe' question can be asked: tap the country on the globe,
// or type the name of the country shown on it. Both share the 'globe' progress.
export type GlobeKind = 'locate' | 'name'
export const GLOBE_KINDS: GlobeKind[] = ['locate', 'name']

// Progress for each question about one country. Questions that have never
// been answered have no entry.
export type CountryProgress = Partial<Record<QuestionId, QuestionProgress>>

// Progress for every country the user has reviewed, keyed by ISO alpha-3 code.
// Countries that have never been reviewed have no entry.
export type DeckProgress = Record<string, CountryProgress>

// Picks a random country from `codes` for the next card, never `previousCode`
// (the one just shown) unless it is the only one. The less familiar a country
// is for `questionIds` (`pickingFamiliarity`), the likelier it is: each
// country's chance is proportional to 1 − its familiarity. Returns null if
// `codes` is empty. `random` is a parameter so tests can make the choice
// predictable.
export function chooseRandomCountry(
  codes: string[],
  progress: DeckProgress,
  today: string,
  questionIds: QuestionId[],
  previousCode: string | null,
  random: () => number = Math.random,
): string | null {
  const otherCodes = codes.filter((code) => code !== previousCode)
  const choices = otherCodes.length > 0 ? otherCodes : codes
  if (choices.length === 0) return null

  const weights = choices.map((code) => 1 - pickingFamiliarity(progress[code], questionIds, today))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  // Every country perfectly familiar: each is equally likely.
  if (totalWeight <= 0) return choices[Math.floor(random() * choices.length)]

  // Walks along the weights until passing a random point in their total.
  let point = random() * totalWeight
  for (let i = 0; i < choices.length; i++) {
    point -= weights[i]
    if (point < 0) return choices[i]
  }
  // Only reached through rounding, with `point` at the very end.
  return choices[choices.length - 1]
}

// The progress after finishing a country's card. Each asked question gets its
// own FSRS review. Questions not asked keep their progress.
export function reviewCountry(
  progress: DeckProgress,
  code: string,
  questionIds: QuestionId[],
  results: Partial<Record<QuestionId, AnswerResult>>,
  today: string,
): DeckProgress {
  const newCountryProgress: CountryProgress = { ...progress[code] }
  for (const id of questionIds) {
    // Every asked question has a result once the card is finished.
    const result = results[id]!
    newCountryProgress[id] = reviewQuestion(progress[code]?.[id], result, today)
  }
  return { ...progress, [code]: newCountryProgress }
}
