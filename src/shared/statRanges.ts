// Numerical statistics are grouped into named ranges to make them easier to
// learn; cards show only the range title, not the exact number.

// One range: a value belongs to it if it is at least `min` and below the next
// range's `min`. Ranges are listed from smallest to largest.
export type StatRange = {
  title: string
  min: number
}

export const POPULATION_RANGES: StatRange[] = [
  { title: 'minute', min: 0 },
  { title: 'few', min: 100_000 },
  { title: 'smallish', min: 1_000_000 },
  { title: 'moderate', min: 10_000_000 },
  { title: 'numerous', min: 50_000_000 },
  { title: 'multitudes', min: 100_000_000 },
  { title: '1.4 billion', min: 1_000_000_000 },
]

// In square kilometres.
export const AREA_RANGES: StatRange[] = [
  { title: 'teensy-weensy', min: 0 },
  { title: 'tiny', min: 10_000 },
  { title: 'small', min: 100_000 },
  { title: 'medium', min: 300_000 },
  { title: 'large', min: 1_000_000 },
  { title: 'immense', min: 5_000_000 },
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
