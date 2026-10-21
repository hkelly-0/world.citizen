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

// Returns the title of the range the value falls in: the last range whose
// minimum it reaches.
export function rangeTitle(ranges: StatRange[], value: number): string {
  let title = ranges[0].title
  for (const range of ranges) {
    if (value >= range.min) title = range.title
  }
  return title
}
