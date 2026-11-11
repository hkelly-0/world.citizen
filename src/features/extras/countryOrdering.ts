import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { formatIhdi, formatLargeNumber } from '../../shared/statRanges'

// The stats the country table shows and can be ordered by.
export type TableStatId = 'area' | 'population' | 'ihdi' | 'density'

// In column order.
export const TABLE_STATS: TableStatId[] = ['area', 'population', 'ihdi', 'density']

// The number a country is ordered by. The IHDI is UNDP's if it has one,
// otherwise our estimate, otherwise null (Monaco, North Korea, and Vatican
// City have neither). Density is people per km².
export function statValue(country: CountryFacts, statId: TableStatId): number | null {
  if (statId === 'area') return country.areaKm2
  if (statId === 'population') return country.population
  if (statId === 'density') return country.population / country.areaKm2
  return country.ihdi ?? country.ihdiEstimate
}

// The value as shown in the table, rounded like the rest of the app: e.g.
// "17M" (the km² is in the column heading), "1.5B", "8.6" people per km²,
// and "9.4" or "6.1 (est.)" for the IHDI, multiplied by 10 as everywhere else.
export function formatStat(country: CountryFacts, statId: TableStatId): string {
  if (statId === 'area') return formatLargeNumber(country.areaKm2)
  if (statId === 'population') return formatLargeNumber(country.population)
  if (statId === 'density') return formatLargeNumber(country.population / country.areaKm2)
  if (country.ihdi !== null) return formatIhdi(country.ihdi)
  if (country.ihdiEstimate !== null) return `${formatIhdi(country.ihdiEstimate)} (est.)`
  return 'no data'
}

// What the table is ordered by: a country's name or one of the stats.
export type TableOrderId = 'name' | TableStatId

// All 197 countries in the table's order. Not reversed, names are A–Z and
// stats largest first; reversed, names are Z–A and stats smallest first.
// Countries with no value count as the smallest, so they come last when
// largest first and first when smallest first. Equal values are in
// alphabetical order.
export function sortedCountries(orderId: TableOrderId, isReversed: boolean): CountryFacts[] {
  return Object.values(countryFacts).sort((a, b) => {
    if (orderId === 'name') {
      const aToZ = a.commonName.localeCompare(b.commonName)
      return isReversed ? -aToZ : aToZ
    }
    const valueA = statValue(a, orderId) ?? -Infinity
    const valueB = statValue(b, orderId) ?? -Infinity
    if (valueA === valueB) return a.commonName.localeCompare(b.commonName)
    const largerFirst = valueA > valueB ? -1 : 1
    return isReversed ? -largerFirst : largerFirst
  })
}
