import type { CountryFacts } from '../../shared/countryFacts'
import { AREA_RANGES, IHDI_RANGES, POPULATION_RANGES, rangeTitle } from '../../shared/statRanges'

// Countries without an IHDI have this as their correct IHDI answer.
const NO_DATA = 'No data'

// No country's IHDI is high enough for this range, so it isn't offered.
const UNUSED_IHDI_TITLE = '10 - Fantastic'

// Options are listed largest first, so the biggest range is at the top.
function largestFirst(titles: string[]): string[] {
  return [...titles].reverse()
}

// A question answered by picking one range title.
export type RangeQuestion = {
  label: string
  options: string[]
  correctAnswer: string
}

export function rangeQuestions(country: CountryFacts): RangeQuestion[] {
  return [
    {
      label: 'Area',
      options: largestFirst(AREA_RANGES.map((range) => range.title)),
      correctAnswer: rangeTitle(AREA_RANGES, country.areaKm2),
    },
    {
      label: 'Population',
      options: largestFirst(POPULATION_RANGES.map((range) => range.title)),
      correctAnswer: rangeTitle(POPULATION_RANGES, country.population),
    },
    {
      label: 'IHDI',
      options: [
        ...largestFirst(
          IHDI_RANGES.map((range) => range.title).filter((title) => title !== UNUSED_IHDI_TITLE),
        ),
        NO_DATA,
      ],
      correctAnswer: country.ihdi === null ? NO_DATA : rangeTitle(IHDI_RANGES, country.ihdi),
    },
  ]
}
