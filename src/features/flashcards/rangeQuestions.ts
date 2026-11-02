import type { CountryFacts } from '../../shared/countryFacts'
import {
  AREA_RANGES,
  areaStat,
  IHDI_RANGES,
  ihdiStat,
  NO_DATA,
  POPULATION_RANGES,
  populationStat,
  type RangeLabel,
  type StatRange,
} from '../../shared/statRanges'
import type { AnswerResult } from './fsrs'

// No country's IHDI is high enough for this range, so it isn't offered.
const UNUSED_IHDI_NAME = 'Fantastic'

// Options are listed largest first, so the biggest range is at the top.
function largestFirst(ranges: StatRange[]): StatRange[] {
  return [...ranges].reverse()
}

// A question answered by picking one range. Countries with neither an IHDI
// nor an HDI to estimate it from have NO_DATA as their correct IHDI answer.
export type RangeQuestion = {
  id: 'area' | 'population' | 'ihdi'
  label: string
  options: RangeLabel[]
  correctAnswer: RangeLabel
  // True when the correct answer comes from our estimate, not UNDP's figure.
  isEstimate?: boolean
  // The country's rounded value (`StatValue`'s `value`), shown once answered,
  // or null for an IHDI with no data.
  trueValue: string | null
}

// `chosen` is the name of the picked option. Right if it is the correct one,
// close if it is next to it in the list (one range bigger or smaller),
// otherwise wrong. "No data" is never close: it isn't a range, so it isn't
// next to the lowest IHDI range.
export function rangeAnswerResult(question: RangeQuestion, chosen: string): AnswerResult {
  const correct = question.correctAnswer.name
  if (chosen === correct) return 'right'
  if (chosen === NO_DATA.name || correct === NO_DATA.name) return 'wrong'
  const names = question.options.map((option) => option.name)
  const distance = Math.abs(names.indexOf(chosen) - names.indexOf(correct))
  return distance === 1 ? 'close' : 'wrong'
}

export function rangeQuestions(country: CountryFacts): RangeQuestion[] {
  const area = areaStat(country)
  const population = populationStat(country)
  const ihdi = ihdiStat(country)
  return [
    {
      id: 'area',
      label: 'Area',
      options: largestFirst(AREA_RANGES),
      correctAnswer: area.range,
      trueValue: area.value,
    },
    {
      id: 'population',
      label: 'Population',
      options: largestFirst(POPULATION_RANGES),
      correctAnswer: population.range,
      trueValue: population.value,
    },
    {
      id: 'ihdi',
      label: 'IHDI',
      options: [
        ...largestFirst(IHDI_RANGES.filter((range) => range.name !== UNUSED_IHDI_NAME)),
        NO_DATA,
      ],
      correctAnswer: ihdi === null ? NO_DATA : ihdi.range,
      isEstimate: ihdi?.isEstimate,
      trueValue: ihdi === null ? null : ihdi.value,
    },
  ]
}
