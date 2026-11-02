import { countryFacts } from '../../shared/countryFacts'
import { shuffled } from '../../shared/shuffled'
import {
  AREA_RANGES,
  IHDI_RANGES,
  ihdiRange,
  POPULATION_RANGES,
  rangeOf,
  type StatRange,
} from '../../shared/statRanges'

// The statistics an ordering question can be about.
export type OrderingStat = 'population' | 'area' | 'ihdi'

// How many countries each ordering question shows.
export const ORDERING_COUNT = 4

// A country's range for the stat, and its place in the stat's ranges (higher
// is bigger). True `isEstimate` for an IHDI from our estimate.
export type OrderingTitle = { range: StatRange; rangeIndex: number; isEstimate: boolean }

// Null for an IHDI with neither data nor an estimate.
export function orderingTitle(stat: OrderingStat, code: string): OrderingTitle | null {
  const country = countryFacts[code]
  if (stat === 'ihdi') {
    const ihdi = ihdiRange(country)
    if (ihdi === null) return null
    return {
      range: ihdi.range,
      rangeIndex: IHDI_RANGES.indexOf(ihdi.range),
      isEstimate: ihdi.isEstimate,
    }
  }
  const ranges = stat === 'population' ? POPULATION_RANGES : AREA_RANGES
  const value = stat === 'population' ? country.population : country.areaKm2
  const range = rangeOf(ranges, value)
  // Ranges are listed smallest first, so a later one is bigger.
  return { range, rangeIndex: ranges.indexOf(range), isEstimate: false }
}

// The countries for one ordering question, highest first: ORDERING_COUNT
// Passport countries, each with a different range title for the stat, so
// there are no ties. They are picked by going through the Passport in a
// random order, taking each country whose title isn't taken yet. Null when
// the Passport doesn't have ORDERING_COUNT different titles. `random` is a
// parameter so tests can make the choice predictable.
export function orderingCountries(
  stat: OrderingStat,
  passportCodes: string[],
  random: () => number = Math.random,
): string[] | null {
  const picked: { code: string; rangeIndex: number }[] = []
  for (const code of shuffled(passportCodes, random)) {
    const title = orderingTitle(stat, code)
    if (title === null || picked.some((other) => other.rangeIndex === title.rangeIndex)) continue
    picked.push({ code, rangeIndex: title.rangeIndex })
    if (picked.length === ORDERING_COUNT) break
  }
  if (picked.length < ORDERING_COUNT) return null
  return picked.sort((a, b) => b.rangeIndex - a.rangeIndex).map((country) => country.code)
}

// `order` after the item at `fromIndex` is taken out and put back at `toIndex`,
// moving the items between along by one.
export function moveItem<T>(order: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...order]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

// `order` with the items at the two indices swapped.
export function swapItems<T>(order: T[], indexA: number, indexB: number): T[] {
  const result = [...order]
  result[indexA] = order[indexB]
  result[indexB] = order[indexA]
  return result
}
