import type { QuestionProgress } from './sm2'

// The questions asked about each country. Each has its own SM-2 schedule, so
// e.g. a country's capital can be well known while its population isn't.
export type QuestionId = 'globe' | 'area' | 'population' | 'ihdi' | 'capital'
export const QUESTION_IDS: QuestionId[] = ['globe', 'area', 'population', 'ihdi', 'capital']

// Progress for each question about one country. Questions that have never
// been answered have no entry.
export type CountryProgress = Partial<Record<QuestionId, QuestionProgress>>

// Progress for every country the user has reviewed, keyed by ISO alpha-3 code.
// Countries that have never been reviewed have no entry.
export type DeckProgress = Record<string, CountryProgress>

// When the country's whole card is due: the earliest due date of its answered
// questions. Returns null if none of its questions has been answered.
export function countryDueDate(country: CountryProgress | undefined): string | null {
  if (country === undefined) return null
  let earliest: string | null = null
  for (const id of QUESTION_IDS) {
    const question = country[id]
    if (question !== undefined && (earliest === null || question.dueDate < earliest)) {
      earliest = question.dueDate
    }
  }
  return earliest
}

// Picks the next country to show: the most overdue review first, then a random
// country the user hasn't seen yet. Returns null when nothing is left today.
// `random` is a parameter so tests can make the choice predictable.
export function chooseNextCountry(
  allCodes: string[],
  progress: DeckProgress,
  today: string,
  random: () => number = Math.random,
): string | null {
  const dueCodes = allCodes
    .filter((code) => {
      const dueDate = countryDueDate(progress[code])
      return dueDate !== null && dueDate <= today
    })
    // Due countries all have a due date, so `!` is safe here.
    .sort((a, b) => countryDueDate(progress[a])!.localeCompare(countryDueDate(progress[b])!))
  if (dueCodes.length > 0) return dueCodes[0]

  const newCodes = allCodes.filter((code) => countryDueDate(progress[code]) === null)
  if (newCodes.length > 0) return newCodes[Math.floor(random() * newCodes.length)]

  return null
}
