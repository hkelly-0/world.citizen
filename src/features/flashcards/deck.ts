import { gradeFromAnswer, reviewQuestion, type AnswerResult, type QuestionProgress } from './sm2'

// The questions asked about each country. Each has its own SM-2 schedule, so
// e.g. a country's capital can be well known while its population isn't.
export type QuestionId = 'globe' | 'area' | 'population' | 'ihdi' | 'capital'
export const QUESTION_IDS: QuestionId[] = ['globe', 'area', 'population', 'ihdi', 'capital']

// The two ways the 'globe' question can be asked: tap the country on the globe,
// or type the name of the country shown on it. Both share the 'globe' schedule.
export type GlobeKind = 'locate' | 'name'
export const GLOBE_KINDS: GlobeKind[] = ['locate', 'name']

// Progress for each question about one country. Questions that have never
// been answered have no entry.
export type CountryProgress = Partial<Record<QuestionId, QuestionProgress>>

// Progress for every country the user has reviewed, keyed by ISO alpha-3 code.
// Countries that have never been reviewed have no entry.
export type DeckProgress = Record<string, CountryProgress>

// When the country's card is due: the earliest due date of its answered
// questions among `questionIds` (all 5 for Classic, or the question types
// ticked for custom practice). Returns null if none of them has been answered.
export function countryDueDate(
  country: CountryProgress | undefined,
  questionIds: QuestionId[],
): string | null {
  if (country === undefined) return null
  let earliest: string | null = null
  for (const id of questionIds) {
    const question = country[id]
    if (question !== undefined && (earliest === null || question.dueDate < earliest)) {
      earliest = question.dueDate
    }
  }
  return earliest
}

// Picks the next country to show: the most overdue review first, then a random
// country the user hasn't seen yet. Only the questions in `questionIds` count.
// Returns null when nothing is left today.
// `random` is a parameter so tests can make the choice predictable.
export function chooseNextCountry(
  allCodes: string[],
  progress: DeckProgress,
  today: string,
  questionIds: QuestionId[],
  random: () => number = Math.random,
): string | null {
  const dueDate = (code: string) => countryDueDate(progress[code], questionIds)
  const dueCodes = allCodes
    .filter((code) => {
      const date = dueDate(code)
      return date !== null && date <= today
    })
    // Due countries all have a due date, so `!` is safe here.
    .sort((a, b) => dueDate(a)!.localeCompare(dueDate(b)!))
  if (dueCodes.length > 0) return dueCodes[0]

  const newCodes = allCodes.filter((code) => dueDate(code) === null)
  if (newCodes.length > 0) return newCodes[Math.floor(random() * newCodes.length)]

  return null
}

// The progress after finishing a country's card. Each asked question gets its
// own SM-2 review, even ones that weren't due yet. Questions not asked keep
// their progress.
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
    newCountryProgress[id] = reviewQuestion(progress[code]?.[id], gradeFromAnswer(result), today)
  }
  return { ...progress, [code]: newCountryProgress }
}
