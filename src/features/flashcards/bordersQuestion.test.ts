import { describe, expect, it } from 'vitest'
import { borderingCountries, markBorderAnswers, missedBorderBoxes } from './bordersQuestion'

describe('borderingCountries', () => {
  it("lists a country's land neighbours by name", () => {
    // Andorra, Belgium, Germany, Italy, Luxembourg, Monaco, Spain, Switzerland.
    expect(borderingCountries('FRA')).toEqual([
      'AND',
      'BEL',
      'DEU',
      'ITA',
      'LUX',
      'MCO',
      'ESP',
      'CHE',
    ])
  })

  it('is empty for islands', () => {
    expect(borderingCountries('ISL')).toEqual([])
  })
})

describe('markBorderAnswers', () => {
  const franceBorders = borderingCountries('FRA')

  it('matches names ignoring case, accents and surrounding spaces', () => {
    expect(markBorderAnswers([' spain ', 'BELGIUM', 'Italy', 'Germany'], franceBorders)).toEqual([
      'ESP',
      'BEL',
      'ITA',
      'DEU',
    ])
  })

  it('gives null for blanks, countries not bordering, and repeats', () => {
    expect(markBorderAnswers(['', 'Portugal', 'Spain', 'spain'], franceBorders)).toEqual([
      null,
      null,
      'ESP',
      null,
    ])
  })

  it('accepts alternative names', () => {
    // Türkiye borders Greece; "Turkey" is in countryNameAlternatives.json.
    expect(markBorderAnswers(['Turkey'], borderingCountries('GRC'))).toEqual(['TUR'])
  })
})

describe('missedBorderBoxes', () => {
  it('marks blank boxes while unnamed neighbours are left, from the first', () => {
    // Andorra borders France and Spain: one blank box could have held France.
    expect(missedBorderBoxes(['Spain', '', '', ''], borderingCountries('AND'))).toEqual([
      false,
      true,
      false,
      false,
    ])
  })

  it('does not count wrong answers as naming a neighbour', () => {
    expect(missedBorderBoxes(['Portugal', '', '', ''], borderingCountries('AND'))).toEqual([
      false,
      true,
      true,
      false,
    ])
  })

  it('marks no box once every neighbour is named', () => {
    expect(missedBorderBoxes(['france', 'Spain', '', ''], borderingCountries('AND'))).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it('counts a box of only spaces as blank', () => {
    expect(
      missedBorderBoxes(['  ', 'Spain', 'France', 'Italy'], borderingCountries('FRA')),
    ).toEqual([true, false, false, false])
  })
})
