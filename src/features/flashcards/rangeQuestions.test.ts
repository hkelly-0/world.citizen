import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { IHDI_RANGES, type RangeLabel } from '../../shared/statRanges'
import { rangeAnswerResult, rangeQuestions } from './rangeQuestions'

const france = countryFacts['FRA']

describe('rangeQuestions', () => {
  it('lists options largest first, without "Fantastic", with "No data" last', () => {
    const [area, population, ihdi] = rangeQuestions(france)
    const names = (options: RangeLabel[]) => options.map((option) => option.name)

    expect(names(area.options)).toEqual([
      'Immense',
      'Large',
      'Medium',
      'Small',
      'Tiny',
      'Minuscule',
    ])
    expect(names(population.options)[0]).toBe('1.4 Billion')
    expect(names(population.options).at(-1)).toBe('Minute')
    expect(names(ihdi.options)).toEqual([
      'Excellent',
      'Great',
      'Good',
      'Ok',
      'Bad',
      'Very Bad',
      'Awful',
      'Very Awful',
      'No data',
    ])
  })

  it("always includes each country's correct answers among the options", () => {
    for (const country of Object.values(countryFacts)) {
      for (const question of rangeQuestions(country)) {
        expect(question.options).toContain(question.correctAnswer)
      }
    }
  })

  it('uses the estimated IHDI for a country that has an HDI but no IHDI', () => {
    // Saudi Arabia: no IHDI from UNDP, HDI 0.9, so an estimate of 0.804.
    const saudiArabia = countryFacts['SAU']
    expect(saudiArabia.ihdi).toBeNull()
    expect(saudiArabia.ihdiEstimate).not.toBeNull()

    const ihdi = rangeQuestions(saudiArabia)[2]
    expect(ihdi.correctAnswer.name).toBe('Great')
    expect(ihdi.isEstimate).toBe(true)
  })

  it('does not mark a real IHDI as an estimate, and uses "No data" with neither', () => {
    expect(rangeQuestions(france)[2].isEstimate).toBe(false)
    expect(rangeQuestions(countryFacts['VAT'])[2].correctAnswer.name).toBe('No data')
  })

  it("gives each question the country's true value, marking an estimated IHDI", () => {
    expect(rangeQuestions(france).map((question) => question.trueValue)).toEqual([
      '552K km²',
      '66.7M',
      '8.4',
    ])
    expect(rangeQuestions(countryFacts['SAU'])[2].trueValue).toBe('8.0 (est.)')
    expect(rangeQuestions(countryFacts['VAT'])[2].trueValue).toBeNull()
  })
})

describe('rangeAnswerResult', () => {
  it('counts the correct range as right, a neighbouring one as close and others as wrong', () => {
    // France's area is "≥ 300K km²" (Medium).
    const area = rangeQuestions(france)[0]
    expect(rangeAnswerResult(area, 'Medium')).toBe('right')
    expect(rangeAnswerResult(area, 'Large')).toBe('close')
    expect(rangeAnswerResult(area, 'Small')).toBe('close')
    expect(rangeAnswerResult(area, 'Immense')).toBe('wrong')
    expect(rangeAnswerResult(area, 'Tiny')).toBe('wrong')
  })

  it('never counts "No data" as close to the lowest IHDI range', () => {
    // Vatican has no IHDI, so its answer is "No data".
    const vaticanIhdi = rangeQuestions(countryFacts['VAT'])[2]
    expect(rangeAnswerResult(vaticanIhdi, 'Very Awful')).toBe('wrong')

    const lowIhdi = { ...vaticanIhdi, correctAnswer: IHDI_RANGES[0] }
    expect(rangeAnswerResult(lowIhdi, 'No data')).toBe('wrong')
    expect(rangeAnswerResult(lowIhdi, 'Awful')).toBe('close')
  })
})
