import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { rangeQuestions } from './rangeQuestions'

const france = countryFacts['FRA']

describe('rangeQuestions', () => {
  it('lists options largest first, without "10 - Fantastic", with "No data" last', () => {
    const [area, population, ihdi] = rangeQuestions(france)

    expect(area.options).toEqual(['Immense', 'Large', 'Medium', 'Small', 'Tiny', 'Teensy-weensy'])
    expect(population.options[0]).toBe('1.4 Billion')
    expect(population.options.at(-1)).toBe('Minute')
    expect(ihdi.options).toEqual([
      '9 - Excellent',
      '8 - Great',
      '7 - Good',
      '6 - Ok',
      '5 - Bad',
      '4 - Very Bad',
      '3 - Awful',
      '2 - Very Awful',
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
