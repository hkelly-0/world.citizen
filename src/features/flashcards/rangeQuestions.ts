import type { CountryFacts } from '../../shared/countryFacts'
import {
  AREA_RANGES,
  IHDI_RANGES,
  ihdiRange,
  NO_DATA,
  POPULATION_RANGES,
  rangeOf,
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
  // The country's own value, shown once answered (e.g. "45.3M"), or null for
  // an IHDI with no data.
  trueValue: string | null
}

// Rounds to 3 significant figures and shortens with K, M or B like the range
// bounds, e.g. 45_312_000 -> "45.3M". Trailing zeros are dropped ("1M").
export function formatLargeNumber(value: number): string {
  const rounded = Number(value.toPrecision(3))
  const suffixes: [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ]
  for (const [size, suffix] of suffixes) {
    if (rounded >= size) return `${Number((rounded / size).toPrecision(3))}${suffix}`
  }
  return String(rounded)
}

// Multiplied by 10 like the IHDI range bounds and given to one decimal place,
// e.g. 0.543 -> "5.4".
export function formatIhdi(ihdi: number): string {
  return (ihdi * 10).toFixed(1)
}

// The real IHDI if UNDP has one, otherwise our estimate marked "(est.)",
// otherwise null.
function ihdiTrueValue(country: CountryFacts): string | null {
  if (country.ihdi !== null) return formatIhdi(country.ihdi)
  if (country.ihdiEstimate !== null) return `${formatIhdi(country.ihdiEstimate)} (est.)`
  return null
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
  const ihdi = ihdiRange(country)
  return [
    {
      id: 'area',
      label: 'Area',
      options: largestFirst(AREA_RANGES),
      correctAnswer: rangeOf(AREA_RANGES, country.areaKm2),
      trueValue: `${formatLargeNumber(country.areaKm2)} km²`,
    },
    {
      id: 'population',
      label: 'Population',
      options: largestFirst(POPULATION_RANGES),
      correctAnswer: rangeOf(POPULATION_RANGES, country.population),
      trueValue: formatLargeNumber(country.population),
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
      trueValue: ihdiTrueValue(country),
    },
  ]
}
