// Numerical statistics are grouped into named ranges to make them easier to
// learn; cards show only the range title (a name plus the range's lower bound,
// e.g. "≥ 5M km²  /  Immense"), not the exact number.

// One range: a value belongs to it if it is at least `min` and below the next
// range's `min`. Ranges are listed from smallest to largest.
export type StatRange = {
  title: string
  min: number
}

export const POPULATION_RANGES: StatRange[] = [
  { title: '< 100K  /  Minute', min: 0 },
  { title: '≥ 100K  /  Few', min: 100_000 },
  { title: '≥ 1M  /  Smallish', min: 1_000_000 },
  { title: '≥ 10M  /  Moderate', min: 10_000_000 },
  { title: '≥ 50M  /  Numerous', min: 50_000_000 },
  { title: '≥ 100M  /  Multitudes', min: 100_000_000 },
  { title: '1.4 Billion', min: 1_000_000_000 },
]

// In square kilometres.
export const AREA_RANGES: StatRange[] = [
  { title: '< 10K km²  /  Teensy-weensy', min: 0 },
  { title: '≥ 10K km²  /  Tiny', min: 10_000 },
  { title: '≥ 100K km²  /  Small', min: 100_000 },
  { title: '≥ 300K km²  /  Medium', min: 300_000 },
  { title: '≥ 1M km²  /  Large', min: 1_000_000 },
  { title: '≥ 5M km²  /  Immense', min: 5_000_000 },
]

// Inequality-adjusted HDI. Each title's number is the IHDI multiplied by 10
// and rounded (halves round up), e.g. 0.65 -> "7  /  Good". Values below 0.25
// would round to 1 or 0, but no country is that low, so they count as 2.
export const IHDI_RANGES: StatRange[] = [
  { title: '2  /  Very Awful', min: 0 },
  { title: '3  /  Awful', min: 0.25 },
  { title: '4  /  Very Bad', min: 0.35 },
  { title: '5  /  Bad', min: 0.45 },
  { title: '6  /  Ok', min: 0.55 },
  { title: '7  /  Good', min: 0.65 },
  { title: '8  /  Great', min: 0.75 },
  { title: '9  /  Excellent', min: 0.85 },
  { title: '10  /  Fantastic', min: 0.95 },
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
