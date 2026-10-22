import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { rangeQuestions } from './rangeQuestions'

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
})
