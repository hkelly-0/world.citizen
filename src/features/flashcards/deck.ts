import type { CardProgress } from './sm2'

// Progress for every country the user has reviewed, keyed by ISO alpha-3 code.
// Countries that have never been reviewed have no entry.
export type DeckProgress = Record<string, CardProgress>

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
    .filter((code) => progress[code] !== undefined && progress[code].dueDate <= today)
    .sort((a, b) => progress[a].dueDate.localeCompare(progress[b].dueDate))
  if (dueCodes.length > 0) return dueCodes[0]

  const newCodes = allCodes.filter((code) => progress[code] === undefined)
  if (newCodes.length > 0) return newCodes[Math.floor(random() * newCodes.length)]

  return null
}
