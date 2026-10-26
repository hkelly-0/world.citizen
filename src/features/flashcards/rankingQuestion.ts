import { countryFacts } from '../../shared/countryFacts'
import { shuffled } from '../../shared/shuffled'
import {
  AREA_RANGES,
  IHDI_RANGES,
  ihdiRange,
  POPULATION_RANGES,
  rangeTitle,
  type StatRange,
} from '../../shared/statRanges'

// The statistics a ranking question can be about.
export type RankingStat = 'population' | 'area' | 'ihdi'

// How many countries each ranking question shows.
export const RANKING_COUNT = 4

// A country's range title for the stat, and its place in the stat's ranges
// (higher is bigger). True `isEstimate` for an IHDI from our estimate.
export type RankingTitle = { title: string; rank: number; isEstimate: boolean }

// Null for an IHDI with neither data nor an estimate.
export function rankingTitle(stat: RankingStat, code: string): RankingTitle | null {
  const country = countryFacts[code]
  if (stat === 'ihdi') {
    const ihdi = ihdiRange(country)
    if (ihdi === null) return null
    return { title: ihdi.title, rank: rankOf(IHDI_RANGES, ihdi.title), isEstimate: ihdi.isEstimate }
  }
  const ranges = stat === 'population' ? POPULATION_RANGES : AREA_RANGES
  const value = stat === 'population' ? country.population : country.areaKm2
  const title = rangeTitle(ranges, value)
  return { title, rank: rankOf(ranges, title), isEstimate: false }
}

// Ranges are listed smallest first, so a later one is bigger.
function rankOf(ranges: StatRange[], title: string): number {
  return ranges.findIndex((range) => range.title === title)
}

// The countries for one ranking question, highest first: RANKING_COUNT
// Passport countries, each with a different range title for the stat, so
// there are no ties. They are picked by going through the Passport in a
// random order, taking each country whose title isn't taken yet. Null when
// the Passport doesn't have RANKING_COUNT different titles. `random` is a
// parameter so tests can make the choice predictable.
export function rankingCountries(
  stat: RankingStat,
  passportCodes: string[],
  random: () => number = Math.random,
): string[] | null {
  const picked: { code: string; rank: number }[] = []
  for (const code of shuffled(passportCodes, random)) {
    const title = rankingTitle(stat, code)
    if (title === null || picked.some((other) => other.rank === title.rank)) continue
    picked.push({ code, rank: title.rank })
    if (picked.length === RANKING_COUNT) break
  }
  if (picked.length < RANKING_COUNT) return null
  return picked.sort((a, b) => b.rank - a.rank).map((country) => country.code)
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
