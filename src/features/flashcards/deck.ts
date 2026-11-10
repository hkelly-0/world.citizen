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

// Picks a random country from `codes` for the next card (the caller leaves out
// those played recently). The less familiar a country is for `questionIds`
// (`pickingFamiliarity`), the likelier it is: each country's chance is
// proportional to 1 − its familiarity. Returns null if `codes` is empty.
// `random` is a parameter so tests can make the choice predictable.
export function chooseRandomCountry(
  codes: string[],
  progress: DeckProgress,
  today: string,
  questionIds: QuestionId[],
  random: () => number = Math.random,
): string | null {
  if (codes.length === 0) return null

  const weights = codes.map((code) => 1 - pickingFamiliarity(progress[code], questionIds, today))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  // Every country perfectly familiar: each is equally likely.
  if (totalWeight <= 0) return codes[Math.floor(random() * codes.length)]

  // Walks along the weights until passing a random point in their total.
  let point = random() * totalWeight
  for (let i = 0; i < codes.length; i++) {
    point -= weights[i]
    if (point < 0) return codes[i]
  }
  // Only reached through rounding, with `point` at the very end.
  return codes[codes.length - 1]
}

// The progress after answering one of a country's questions: that question
// gets its FSRS review. The country's other questions keep their progress.
export function reviewAnswer(
  progress: DeckProgress,
  code: string,
  id: QuestionId,
  result: AnswerResult,
  today: string,
): DeckProgress {
  const newCountryProgress: CountryProgress = {
    ...progress[code],
    [id]: reviewQuestion(progress[code]?.[id], result, today),
  }
  return { ...progress, [code]: newCountryProgress }
}
