import flagSimilarityJson from '../../data/flagSimilarity.json'
import { MATCHING_COUNT } from './matchingQuestion'

// Every country's similarity to every other country's flag, most similar
// first, made by scripts/make-flag-similarity.mjs.
const similarFlags: Record<string, Record<string, number>> = flagSimilarityJson

// The countries for one flag matching question: a random country from
// `passportCodes` (never `previousFirstCode`, unless it is the only choice),
// then the MATCHING_COUNT - 1 Passport countries whose flags are most similar
// to its flag, most similar first. Null when the Passport has fewer than
// MATCHING_COUNT countries. `random` is a parameter so tests can make the
// choice predictable.
export function flagMatchingCountries(
  passportCodes: string[],
  previousFirstCode: string | null,
  random: () => number = Math.random,
): string[] | null {
  if (passportCodes.length < MATCHING_COUNT) return null
  const firstChoices = passportCodes.filter((code) => code !== previousFirstCode)
  const firstCode = firstChoices[Math.floor(random() * firstChoices.length)]
  const mostSimilar = Object.keys(similarFlags[firstCode])
    .filter((code) => passportCodes.includes(code))
    .slice(0, MATCHING_COUNT - 1)
  return [firstCode, ...mostSimilar]
}
