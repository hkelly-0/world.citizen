import flagSimilarityJson from '../../data/flagSimilarity.json'

// Each country's most similar-looking flags, made by
// scripts/make-flag-similarity.mjs.
const similarFlags: Record<string, Record<string, number>> = flagSimilarityJson

// How many flags the flag question offers, the correct one included.
export const FLAG_OPTION_COUNT = 4

// The ISO alpha-3 codes of the flags offered for `correctCode`: the correct
// one plus others picked at random from its most similar-looking flags, never
// repeated, in a random order. `random` is a parameter so tests can make the
// choice predictable.
export function flagOptions(correctCode: string, random: () => number = Math.random): string[] {
  const otherCodes = Object.keys(similarFlags[correctCode])
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
