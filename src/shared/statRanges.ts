// Numerical statistics are grouped into named ranges to make them easier to
// learn; cards show the range's title (its lower bound and name, e.g.
// "≥ 5M km²" and "Immense"). `RangeTitle.tsx` shows one. Only a range
// question's answer and the globe's info panel show the rounded value
// (`trueValue` in rangeQuestions.ts).

// A range's title. `bound` is null for a range with only a name (e.g.
// "1.4 Billion"). Names are unique within each list, so range questions use
// them to tell the options apart.
export type RangeLabel = {
  bound: string | null
  name: string
}

// One range: a value belongs to it if it is at least `min` and below the next
// range's `min`. Ranges are listed from smallest to largest.
export type StatRange = RangeLabel & {
  min: number
}

// Shown, and offered as an IHDI answer, for a country with neither an IHDI nor
// an HDI to estimate it from. It isn't a range.
export const NO_DATA: RangeLabel = { bound: null, name: 'No data' }

export const POPULATION_RANGES: StatRange[] = [
  { bound: '< 100K', name: 'Minute', min: 0 },
  { bound: '≥ 100K', name: 'Few', min: 100_000 },
  { bound: '≥ 1M', name: 'Smallish', min: 1_000_000 },
  { bound: '≥ 10M', name: 'Moderate', min: 10_000_000 },
  { bound: '≥ 50M', name: 'Numerous', min: 50_000_000 },
  { bound: '≥ 100M', name: 'Multitudes', min: 100_000_000 },
  { bound: null, name: '1.4 Billion', min: 1_000_000_000 },
]

// In square kilometres.
export const AREA_RANGES: StatRange[] = [
  { bound: '< 10K km²', name: 'Minuscule', min: 0 },
  { bound: '≥ 10K km²', name: 'Tiny', min: 10_000 },
  { bound: '≥ 100K km²', name: 'Small', min: 100_000 },
  { bound: '≥ 300K km²', name: 'Medium', min: 300_000 },
  { bound: '≥ 1M km²', name: 'Large', min: 1_000_000 },
  { bound: '≥ 5M km²', name: 'Immense', min: 5_000_000 },
]

// Inequality-adjusted HDI. Each bound is the IHDI multiplied by 10 and
// rounded (halves round up), e.g. 0.65 -> "7" (Good). Values below 0.25
// would round to 1 or 0, but no country is that low, so they count as 2.
export const IHDI_RANGES: StatRange[] = [
  { bound: '2', name: 'Very Awful', min: 0 },
  { bound: '3', name: 'Awful', min: 0.25 },
  { bound: '4', name: 'Very Bad', min: 0.35 },
  { bound: '5', name: 'Bad', min: 0.45 },
  { bound: '6', name: 'Ok', min: 0.55 },
  { bound: '7', name: 'Good', min: 0.65 },
  { bound: '8', name: 'Great', min: 0.75 },
  { bound: '9', name: 'Excellent', min: 0.85 },
  { bound: '10', name: 'Fantastic', min: 0.95 },
]

// Returns the range the value falls in: the last range whose minimum it
// reaches.
export function rangeOf(ranges: StatRange[], value: number): StatRange {
  let found = ranges[0]
  for (const range of ranges) {
    if (value >= range.min) found = range
  }
  return found
}

// The IHDI range to show for a country: from its real IHDI if UNDP has one,
// otherwise from our estimate (isEstimate is then true), otherwise null.
export function ihdiRange(country: {
  ihdi: number | null
  ihdiEstimate: number | null
}): { range: StatRange; isEstimate: boolean } | null {
  if (country.ihdi !== null) {
    return { range: rangeOf(IHDI_RANGES, country.ihdi), isEstimate: false }
  }
  if (country.ihdiEstimate !== null) {
    return { range: rangeOf(IHDI_RANGES, country.ihdiEstimate), isEstimate: true }
  }
  return null
}
