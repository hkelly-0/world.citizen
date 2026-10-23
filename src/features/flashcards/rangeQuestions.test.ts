import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { rangeAnswerResult, rangeQuestions } from './rangeQuestions'

const france = countryFacts['FRA']

describe('rangeQuestions', () => {
  it('lists options largest first, without "10  /  Fantastic", with "No data" last', () => {
    const [area, population, ihdi] = rangeQuestions(france)

    expect(area.options).toEqual([
      '≥ 5M km²  /  Immense',
      '≥ 1M km²  /  Large',
      '≥ 300K km²  /  Medium',
      '≥ 100K km²  /  Small',
      '≥ 10K km²  /  Tiny',
      '< 10K km²  /  Teensy-weensy',
    ])
    expect(population.options[0]).toBe('1.4 Billion')
    expect(population.options.at(-1)).toBe('< 100K  /  Minute')
    expect(ihdi.options).toEqual([
      '9  /  Excellent',
      '8  /  Great',
      '7  /  Good',
      '6  /  Ok',
      '5  /  Bad',
      '4  /  Very Bad',
      '3  /  Awful',
      '2  /  Very Awful',
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
    expect(ihdi.correctAnswer).toBe('8  /  Great')
    expect(ihdi.isEstimate).toBe(true)
  })

  it('does not mark a real IHDI as an estimate, and uses "No data" with neither', () => {
    expect(rangeQuestions(france)[2].isEstimate).toBe(false)
    expect(rangeQuestions(countryFacts['VAT'])[2].correctAnswer).toBe('No data')
  })
})

describe('rangeAnswerResult', () => {
  it('counts the correct title as right, a neighbouring one as close and others as wrong', () => {
    // France's area is "≥ 300K km²  /  Medium".
    const area = rangeQuestions(france)[0]
    expect(rangeAnswerResult(area, '≥ 300K km²  /  Medium')).toBe('right')
    expect(rangeAnswerResult(area, '≥ 1M km²  /  Large')).toBe('close')
    expect(rangeAnswerResult(area, '≥ 100K km²  /  Small')).toBe('close')
    expect(rangeAnswerResult(area, '≥ 5M km²  /  Immense')).toBe('wrong')
    expect(rangeAnswerResult(area, '≥ 10K km²  /  Tiny')).toBe('wrong')
  })

  it('never counts "No data" as close to the lowest IHDI title', () => {
    // Vatican has no IHDI, so its answer is "No data".
    const vaticanIhdi = rangeQuestions(countryFacts['VAT'])[2]
    expect(rangeAnswerResult(vaticanIhdi, '2  /  Very Awful')).toBe('wrong')

    const lowIhdi = { ...vaticanIhdi, correctAnswer: '2  /  Very Awful' }
    expect(rangeAnswerResult(lowIhdi, 'No data')).toBe('wrong')
    expect(rangeAnswerResult(lowIhdi, '3  /  Awful')).toBe('close')
  })
})
