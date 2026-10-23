import type { CountryFacts } from '../../shared/countryFacts'
import {
  AREA_RANGES,
  IHDI_RANGES,
  ihdiRange,
  POPULATION_RANGES,
  rangeTitle,
} from '../../shared/statRanges'
import type { AnswerResult } from './fsrs'

// Countries with neither an IHDI nor an HDI to estimate it from have this as
// their correct IHDI answer.
const NO_DATA = 'No data'

// No country's IHDI is high enough for this range, so it isn't offered.
const UNUSED_IHDI_TITLE = '10  /  Fantastic'

// Options are listed largest first, so the biggest range is at the top.
function largestFirst(titles: string[]): string[] {
  return [...titles].reverse()
}

// A question answered by picking one range title.
export type RangeQuestion = {
  id: 'area' | 'population' | 'ihdi'
  label: string
  options: string[]
  correctAnswer: string
  // True when the correct answer comes from our estimate, not UNDP's figure.
  isEstimate?: boolean
}

// Right if the chosen title is the correct one, close if it is next to it in
// the list (one range bigger or smaller), otherwise wrong. "No data" is never
// close: it isn't a range, so it isn't next to the lowest IHDI title.
export function rangeAnswerResult(question: RangeQuestion, chosen: string): AnswerResult {
  if (chosen === question.correctAnswer) return 'right'
  if (chosen === NO_DATA || question.correctAnswer === NO_DATA) return 'wrong'
  const distance = Math.abs(
    question.options.indexOf(chosen) - question.options.indexOf(question.correctAnswer),
  )
  return distance === 1 ? 'close' : 'wrong'
}

export function rangeQuestions(country: CountryFacts): RangeQuestion[] {
  const ihdi = ihdiRange(country)
  return [
    {
      id: 'area',
      label: 'Area',
      options: largestFirst(AREA_RANGES.map((range) => range.title)),
      correctAnswer: rangeTitle(AREA_RANGES, country.areaKm2),
    },
    {
      id: 'population',
      label: 'Population',
      options: largestFirst(POPULATION_RANGES.map((range) => range.title)),
      correctAnswer: rangeTitle(POPULATION_RANGES, country.population),
    },
    {
      id: 'ihdi',
      label: 'IHDI',
      options: [
        ...largestFirst(
          IHDI_RANGES.map((range) => range.title).filter((title) => title !== UNUSED_IHDI_TITLE),
        ),
        NO_DATA,
      ],
      correctAnswer: ihdi === null ? NO_DATA : ihdi.title,
      isEstimate: ihdi?.isEstimate,
    },
  ]
}
