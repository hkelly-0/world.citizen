import { countryFacts } from '../../shared/countryFacts'
import {
  AREA_RANGES,
  IHDI_RANGES,
  ihdiStat,
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
    const ihdi = ihdiStat(country)
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
// there are no ties. To make the order hard to tell, their ranges are as close
// together as the Passport allows: adjacent ranges when it has them, otherwise
// the closest ones it has. When several sets of ranges are equally close, one
// is picked at random, weighted by how many Passport countries it holds. Null
// when the Passport doesn't have ORDERING_COUNT different titles. `random` is
// a parameter so tests can make the choice predictable.
export function orderingCountries(
  stat: OrderingStat,
  passportCodes: string[],
  random: () => number = Math.random,
): string[] | null {
  const codesByRange = new Map<number, string[]>()
  for (const code of passportCodes) {
    const title = orderingTitle(stat, code)
    if (title === null) continue
    codesByRange.set(title.rangeIndex, [...(codesByRange.get(title.rangeIndex) ?? []), code])
  }
  const rangeIndices = [...codesByRange.keys()].sort((a, b) => a - b)
  if (rangeIndices.length < ORDERING_COUNT) return null

  // Every run of ORDERING_COUNT ranges that are next to each other among the
  // ones the Passport has. Those it has may still have gaps between them.
  const runs: number[][] = []
  for (let start = 0; start + ORDERING_COUNT <= rangeIndices.length; start++) {
    runs.push(rangeIndices.slice(start, start + ORDERING_COUNT))
  }
  const runSpan = (run: number[]) => run[run.length - 1] - run[0]
  const smallestSpan = Math.min(...runs.map(runSpan))
  const closestRuns = runs.filter((run) => runSpan(run) === smallestSpan)

  const run = chooseRunByCountryCount(closestRuns, codesByRange, random)
  // Ranges are sorted smallest first, so reversed gives highest first.
  return [...run].reverse().map((rangeIndex) => {
    const codes = codesByRange.get(rangeIndex)!
    return codes[Math.floor(random() * codes.length)]
  })
}

// One of `runs` at random, weighted by how many countries its ranges hold.
function chooseRunByCountryCount(
  runs: number[][],
  codesByRange: Map<number, string[]>,
  random: () => number,
): number[] {
  const weights = runs.map((run) =>
    run.reduce((sum, rangeIndex) => sum + codesByRange.get(rangeIndex)!.length, 0),
  )
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  // Walks along the weights until passing a random point in their total.
  let point = random() * totalWeight
  for (let i = 0; i < runs.length; i++) {
    point -= weights[i]
    if (point < 0) return runs[i]
  }
  // Only reached through rounding, with `point` at the very end.
  return runs[runs.length - 1]
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
