// Numerical statistics are grouped into named ranges to make them easier to
// learn; cards show only the range title, not the exact number.

// One range: a value belongs to it if it is at least `min` and below the next
// range's `min`. Ranges are listed from smallest to largest.
export type StatRange = {
  title: string
  min: number
}

export const POPULATION_RANGES: StatRange[] = [
  { title: 'Minute', min: 0 },
  { title: 'Few', min: 100_000 },
  { title: 'Smallish', min: 1_000_000 },
  { title: 'Moderate', min: 10_000_000 },
  { title: 'Numerous', min: 50_000_000 },
  { title: 'Multitudes', min: 100_000_000 },
  { title: '1.4 Billion', min: 1_000_000_000 },
]

// In square kilometres.
export const AREA_RANGES: StatRange[] = [
  { title: 'Teensy-weensy', min: 0 },
  { title: 'Tiny', min: 10_000 },
  { title: 'Small', min: 100_000 },
  { title: 'Medium', min: 300_000 },
  { title: 'Large', min: 1_000_000 },
  { title: 'Immense', min: 5_000_000 },
]

// Inequality-adjusted HDI. Each title's number is the IHDI multiplied by 10
// and rounded (halves round up), e.g. 0.65 -> "7 - Good". Values below 0.25
// would round to 1 or 0, but no country is that low, so they count as 2.
export const IHDI_RANGES: StatRange[] = [
  { title: '2 - Very Awful', min: 0 },
  { title: '3 - Awful', min: 0.25 },
  { title: '4 - Very Bad', min: 0.35 },
  { title: '5 - Bad', min: 0.45 },
  { title: '6 - Ok', min: 0.55 },
  { title: '7 - Good', min: 0.65 },
  { title: '8 - Great', min: 0.75 },
  { title: '9 - Excellent', min: 0.85 },
  { title: '10 - Fantastic', min: 0.95 },
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
