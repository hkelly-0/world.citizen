// Numerical statistics are grouped into named ranges to make them easier to
// learn; cards show only the range title (a name plus the range's lower bound,
// e.g. "Immense - ≥ 5M km²"), not the exact number.

// One range: a value belongs to it if it is at least `min` and below the next
// range's `min`. Ranges are listed from smallest to largest.
export type StatRange = {
  title: string
  min: number
}

export const POPULATION_RANGES: StatRange[] = [
  { title: 'Minute - < 100K', min: 0 },
  { title: 'Few - ≥ 100K', min: 100_000 },
  { title: 'Smallish - ≥ 1M', min: 1_000_000 },
  { title: 'Moderate - ≥ 10M', min: 10_000_000 },
  { title: 'Numerous - ≥ 50M', min: 50_000_000 },
  { title: 'Multitudes - ≥ 100M', min: 100_000_000 },
  { title: '1.4 Billion', min: 1_000_000_000 },
]

// In square kilometres.
export const AREA_RANGES: StatRange[] = [
  { title: 'Teensy-weensy - < 10K km²', min: 0 },
  { title: 'Tiny - ≥ 10K km²', min: 10_000 },
  { title: 'Small - ≥ 100K km²', min: 100_000 },
  { title: 'Medium - ≥ 300K km²', min: 300_000 },
  { title: 'Large - ≥ 1M km²', min: 1_000_000 },
  { title: 'Immense - ≥ 5M km²', min: 5_000_000 },
]

// Inequality-adjusted HDI. Each title's number is the IHDI multiplied by 10
// and rounded (halves round up), e.g. 0.65 -> "Good - 7". Values below 0.25
// would round to 1 or 0, but no country is that low, so they count as 2.
export const IHDI_RANGES: StatRange[] = [
  { title: 'Very Awful - 2', min: 0 },
  { title: 'Awful - 3', min: 0.25 },
  { title: 'Very Bad - 4', min: 0.35 },
  { title: 'Bad - 5', min: 0.45 },
  { title: 'Ok - 6', min: 0.55 },
  { title: 'Good - 7', min: 0.65 },
  { title: 'Great - 8', min: 0.75 },
  { title: 'Excellent - 9', min: 0.85 },
  { title: 'Fantastic - 10', min: 0.95 },
]

// Returns the title of the range the value falls in: the last range whose
// minimum it reaches.
export function rangeTitle(ranges: StatRange[], value: number): string {
  let title = ranges[0].title
  for (const range of ranges) {
    if (value >= range.min) title = range.title
  }
  return title
}

// The IHDI range to show for a country: from its real IHDI if UNDP has one,
// otherwise from our estimate (isEstimate is then true), otherwise null.
export function ihdiRange(country: {
  ihdi: number | null
  ihdiEstimate: number | null
}): { title: string; isEstimate: boolean } | null {
  if (country.ihdi !== null) {
    return { title: rangeTitle(IHDI_RANGES, country.ihdi), isEstimate: false }
  }
  if (country.ihdiEstimate !== null) {
    return { title: rangeTitle(IHDI_RANGES, country.ihdiEstimate), isEstimate: true }
  }
  return null
}
