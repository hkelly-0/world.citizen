import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { rangeAnswerResult, rangeQuestions } from './rangeQuestions'

const france = countryFacts['FRA']

describe('rangeQuestions', () => {
  it('lists options largest first, without "Fantastic - 10", with "No data" last', () => {
    const [area, population, ihdi] = rangeQuestions(france)

    expect(area.options).toEqual(['Immense - ≥ 5M km²', 'Large - ≥ 1M km²', 'Medium - ≥ 300K km²', 'Small - ≥ 100K km²', 'Tiny - ≥ 10K km²', 'Teensy-weensy - < 10K km²'])
    expect(population.options[0]).toBe('1.4 Billion')
    expect(population.options.at(-1)).toBe('Minute - < 100K')
    expect(ihdi.options).toEqual([
      'Excellent - 9',
      'Great - 8',
      'Good - 7',
      'Ok - 6',
      'Bad - 5',
      'Very Bad - 4',
      'Awful - 3',
      'Very Awful - 2',
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

  it("uses the estimated IHDI for a country that has an HDI but no IHDI", () => {
    // Saudi Arabia: no IHDI from UNDP, HDI 0.9, so an estimate of 0.804.
    const saudiArabia = countryFacts['SAU']
    expect(saudiArabia.ihdi).toBeNull()
    expect(saudiArabia.ihdiEstimate).not.toBeNull()

    const ihdi = rangeQuestions(saudiArabia)[2]
    expect(ihdi.correctAnswer).toBe('Great - 8')
    expect(ihdi.isEstimate).toBe(true)
  })

  it('does not mark a real IHDI as an estimate, and uses "No data" with neither', () => {
    expect(rangeQuestions(france)[2].isEstimate).toBe(false)
    expect(rangeQuestions(countryFacts['VAT'])[2].correctAnswer).toBe('No data')
  })
})

describe('rangeAnswerResult', () => {
  it('counts the correct title as right, a neighbouring one as close and others as wrong', () => {
    // France's area is "Medium - ≥ 300K km²".
    const area = rangeQuestions(france)[0]
    expect(rangeAnswerResult(area, 'Medium - ≥ 300K km²')).toBe('right')
    expect(rangeAnswerResult(area, 'Large - ≥ 1M km²')).toBe('close')
    expect(rangeAnswerResult(area, 'Small - ≥ 100K km²')).toBe('close')
    expect(rangeAnswerResult(area, 'Immense - ≥ 5M km²')).toBe('wrong')
    expect(rangeAnswerResult(area, 'Tiny - ≥ 10K km²')).toBe('wrong')
  })

  it('never counts "No data" as close to the lowest IHDI title', () => {
    // Vatican has no IHDI, so its answer is "No data".
    const vaticanIhdi = rangeQuestions(countryFacts['VAT'])[2]
    expect(rangeAnswerResult(vaticanIhdi, 'Very Awful - 2')).toBe('wrong')

    const lowIhdi = { ...vaticanIhdi, correctAnswer: 'Very Awful - 2' }
    expect(rangeAnswerResult(lowIhdi, 'No data')).toBe('wrong')
    expect(rangeAnswerResult(lowIhdi, 'Awful - 3')).toBe('close')
  })
})
