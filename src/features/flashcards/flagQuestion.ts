import countryNeighboursJson from '../../data/countryNeighbours.json'
import flagSimilarityJson from '../../data/flagSimilarity.json'

// Each country's most similar-looking flags, made by
// scripts/make-flag-similarity.mjs.
const similarFlags: Record<string, Record<string, number>> = flagSimilarityJson

// Each country's nearest countries, nearest first, made by
// scripts/make-country-neighbours.mjs.
const countryNeighbours: Record<string, Record<string, number>> = countryNeighboursJson

// How many flags the flag question offers, the correct one included.
export const FLAG_OPTION_COUNT = 4

// How often the wrong flags are neighbouring countries' instead of
// similar-looking ones, and how many of the nearest countries they come from.
export const NEIGHBOUR_FLAGS_CHANCE = 0.5
export const NEIGHBOUR_FLAGS_FROM = 8

// The ISO alpha-3 codes of the flags offered for `correctCode`: the correct
// one plus others picked at random, never repeated, in a random order. The
// others come either from its most similar-looking flags or, with chance
// NEIGHBOUR_FLAGS_CHANCE, from its NEIGHBOUR_FLAGS_FROM nearest countries.
// `random` is a parameter so tests can make the choice predictable.
export function flagOptions(correctCode: string, random: () => number = Math.random): string[] {
  const otherCodes =
    random() < NEIGHBOUR_FLAGS_CHANCE
      ? Object.keys(countryNeighbours[correctCode]).slice(0, NEIGHBOUR_FLAGS_FROM)
      : Object.keys(similarFlags[correctCode])
  const options: string[] = []
  // Takes each wrong flag out of `otherCodes`, so it can't be picked twice.
  while (options.length < FLAG_OPTION_COUNT - 1) {
    const index = Math.floor(random() * otherCodes.length)
    options.push(otherCodes.splice(index, 1)[0])
  }
  // The correct flag goes in at a random place among the wrong ones.
  options.splice(Math.floor(random() * FLAG_OPTION_COUNT), 0, correctCode)
  return options
}
