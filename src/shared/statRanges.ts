// Numerical statistics are grouped into named ranges to make them easier to
// learn; cards show the range's title (its bounds and name, e.g.
// "5M+ km²" and "Immense"). `RangeTitle.tsx` shows one. Only a range
// question's answer and the globe's info panel also show the rounded value
// (`StatValue`'s `value`).

// A range's title. `bound` is null for a title with only a name (e.g.
// "No data"). Names are unique within each list, so range questions use them
// to tell the options apart.
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
  { bound: '0-100K', name: 'Minute', min: 0 },
  { bound: '100K-1M', name: 'Few', min: 100_000 },
  { bound: '1-10M', name: 'Smallish', min: 1_000_000 },
  { bound: '10-50M', name: 'Moderate', min: 10_000_000 },
  { bound: '50-100M', name: 'Numerous', min: 50_000_000 },
  { bound: '100M-1B', name: 'Multitudes', min: 100_000_000 },
  { bound: '1B+', name: 'Billions', min: 1_000_000_000 },
]

// In square kilometres.
export const AREA_RANGES: StatRange[] = [
  { bound: '0-10K km²', name: 'Minuscule', min: 0 },
  { bound: '10-100K km²', name: 'Tiny', min: 10_000 },
  { bound: '100-300K km²', name: 'Small', min: 100_000 },
  { bound: '300K-1M km²', name: 'Medium', min: 300_000 },
  { bound: '1-5M km²', name: 'Large', min: 1_000_000 },
  { bound: '5M+ km²', name: 'Immense', min: 5_000_000 },
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

// Rounds to 2 significant figures and shortens with K, M or B like the range
// bounds, e.g. 45_312_000 -> "45M". Trailing zeros are kept so both figures
// show ("9.0M", "1.0M").
export function formatLargeNumber(value: number): string {
  const rounded = Number(value.toPrecision(2))
  const suffixes: [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ]
  for (const [size, suffix] of suffixes) {
    if (rounded >= size) return `${withTwoFigures(rounded / size)}${suffix}`
  }
  return withTwoFigures(rounded)
}

// Writes a number already rounded to 2 significant figures, keeping a trailing
// zero below 100 (9 -> "9.0"). From 100 up it is written in full (500 -> "500"),
// as toPrecision would give "5.0e+2".
function withTwoFigures(rounded: number): string {
  if (rounded >= 100) return String(Number(rounded.toPrecision(2)))
  return rounded.toPrecision(2)
}

// Multiplied by 10 like the IHDI range bounds and given to 2 significant
// figures, keeping a trailing zero, e.g. 0.543 -> "5.4" and 0.8 -> "8.0".
export function formatIhdi(ihdi: number): string {
  return (ihdi * 10).toPrecision(2)
}

// A country's statistic: the range it falls in, and its rounded value as
// shown to the user (e.g. "45M").
export type StatValue = {
  range: StatRange
  value: string
}

// Rounds to 2 significant figures, but rounds down instead when rounding up
// would reach the next range, so the value doesn't read as that range: e.g.
// a population of 99_924 is 99_000 ("99K"), not 100_000 ("100K").
export function roundWithinRange(ranges: StatRange[], value: number): number {
  const rounded = Number(value.toPrecision(2))
  if (rangeOf(ranges, rounded) === rangeOf(ranges, value)) return rounded
  const unit = 10 ** (Math.floor(Math.log10(value)) - 1)
  return Math.floor(value / unit) * unit
}

export function areaStat(country: { areaKm2: number }): StatValue {
  return {
    range: rangeOf(AREA_RANGES, country.areaKm2),
    value: `${formatLargeNumber(roundWithinRange(AREA_RANGES, country.areaKm2))} km²`,
  }
}

export function populationStat(country: { population: number }): StatValue {
  return {
    range: rangeOf(POPULATION_RANGES, country.population),
    value: formatLargeNumber(roundWithinRange(POPULATION_RANGES, country.population)),
  }
}

// A country's IHDI: its real one if UNDP has one, otherwise our estimate
// (isEstimate is then true, and the value is marked "(est.)"), otherwise null.
export function ihdiStat(country: {
  ihdi: number | null
  ihdiEstimate: number | null
}): (StatValue & { isEstimate: boolean }) | null {
  if (country.ihdi !== null) {
    return {
      range: rangeOf(IHDI_RANGES, country.ihdi),
      value: formatIhdi(country.ihdi),
      isEstimate: false,
    }
  }
  if (country.ihdiEstimate !== null) {
    return {
      range: rangeOf(IHDI_RANGES, country.ihdiEstimate),
      value: `${formatIhdi(country.ihdiEstimate)} (est.)`,
      isEstimate: true,
    }
  }
  return null
}
