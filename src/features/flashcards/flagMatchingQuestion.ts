import flagSimilarityJson from '../../data/flagSimilarity.json'

// Every country's similarity to every other country's flag, most similar
// first, made by scripts/make-flag-similarity.mjs.
const similarFlags: Record<string, Record<string, number>> = flagSimilarityJson

// How many flags (and names) each flag matching question shows.
export const FLAG_MATCHING_COUNT = 4

// The countries for one flag matching question: a random country from
// `passportCodes` (never `previousFirstCode`, unless it is the only choice),
// then the FLAG_MATCHING_COUNT - 1 Passport countries whose flags are most
// similar to its flag, most similar first. Null when the Passport has fewer
// than FLAG_MATCHING_COUNT countries. `random` is a parameter so tests can
// make the choice predictable.
export function flagMatchingCountries(
  passportCodes: string[],
  previousFirstCode: string | null,
  random: () => number = Math.random,
): string[] | null {
  if (passportCodes.length < FLAG_MATCHING_COUNT) return null
  const firstChoices = passportCodes.filter((code) => code !== previousFirstCode)
  const firstCode = firstChoices[Math.floor(random() * firstChoices.length)]
  const mostSimilar = Object.keys(similarFlags[firstCode])
    .filter((code) => passportCodes.includes(code))
    .slice(0, FLAG_MATCHING_COUNT - 1)
  return [firstCode, ...mostSimilar]
}

// A copy of `items` in a random order. `random` is a parameter so tests can
// make the order predictable.
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const remaining = [...items]
  const result: T[] = []
  while (remaining.length > 0) {
    const index = Math.floor(random() * remaining.length)
    result.push(remaining.splice(index, 1)[0])
  }
  return result
}

// The name placed on each flag: `placed[i]` is the country code whose name is
// on the i-th flag shown, or null if that flag has no name on it yet.
export type FlagPlacements = (string | null)[]

// The placements after the name `nameCode` is put on flag `flagIndex`, or
// taken off every flag when `flagIndex` is null. A name already on that flag
// is swapped onto the flag `nameCode` came from, or taken off if `nameCode`
// wasn't on a flag.
export function placeName(
  placed: FlagPlacements,
  nameCode: string,
  flagIndex: number | null,
): FlagPlacements {
  const fromIndex = placed.indexOf(nameCode)
  const result = [...placed]
  if (flagIndex === null) {
    if (fromIndex !== -1) result[fromIndex] = null
    return result
  }
  const displaced = result[flagIndex]
  if (fromIndex !== -1) result[fromIndex] = displaced
  result[flagIndex] = nameCode
  return result
}
