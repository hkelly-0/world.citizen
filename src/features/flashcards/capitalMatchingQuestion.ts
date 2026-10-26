import countryNeighboursJson from '../../data/countryNeighbours.json'
import { countryFacts } from '../../shared/countryFacts'
import { shuffled } from '../../shared/shuffled'
import { MATCHING_COUNT } from './matchingQuestion'

// Each country's nearest countries, nearest first, made by
// scripts/make-country-neighbours.mjs.
const countryNeighbours: Record<string, Record<string, number>> = countryNeighboursJson

// The other countries come first from this many of the first country's
// nearest countries, then from the next ones up to CAPITAL_NEIGHBOURS_LATER.
export const CAPITAL_NEIGHBOURS_FIRST = 8
export const CAPITAL_NEIGHBOURS_LATER = 15

// The countries for one capital matching question: a random country from
// `passportCodes` (never `previousFirstCode`, unless it is the only choice),
// then MATCHING_COUNT - 1 other Passport countries. They are picked at random
// from its CAPITAL_NEIGHBOURS_FIRST nearest countries that are in the
// Passport; if there aren't enough, from its CAPITAL_NEIGHBOURS_LATER nearest;
// then from the whole Passport. Nearby capitals are harder to tell apart.
// Null when the Passport has fewer than MATCHING_COUNT countries. `random` is
// a parameter so tests can make the choice predictable.
export function capitalMatchingCountries(
  passportCodes: string[],
  previousFirstCode: string | null,
  random: () => number = Math.random,
): string[] | null {
  if (passportCodes.length < MATCHING_COUNT) return null
  const firstChoices = passportCodes.filter((code) => code !== previousFirstCode)
  const firstCode = firstChoices[Math.floor(random() * firstChoices.length)]
  const nearest = Object.keys(countryNeighbours[firstCode])
  const groupsInOrder = [
    nearest.slice(0, CAPITAL_NEIGHBOURS_FIRST),
    nearest.slice(0, CAPITAL_NEIGHBOURS_LATER),
    passportCodes,
  ]
  const others: string[] = []
  for (const group of groupsInOrder) {
    const choices = group.filter(
      (code) => passportCodes.includes(code) && code !== firstCode && !others.includes(code),
    )
    others.push(...shuffled(choices, random).slice(0, MATCHING_COUNT - 1 - others.length))
  }
  return [firstCode, ...others]
}

// A country's capital as shown on its label: all of them, for a country with
// more than one.
export function capitalsLabel(code: string): string {
  return countryFacts[code].capitals.join(', ')
}
