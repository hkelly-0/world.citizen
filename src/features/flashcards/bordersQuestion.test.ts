import { describe, expect, it } from 'vitest'
import { borderBoxResults, borderingCountries, markBorderAnswers } from './bordersQuestion'

describe('borderingCountries', () => {
  it("lists a country's land neighbours by name", () => {
    // Andorra, Belgium, Brazil, Germany, Italy, Luxembourg, Monaco, Spain,
    // Suriname, Switzerland.
    expect(borderingCountries('FRA')).toEqual([
      'AND',
      'BEL',
      'BRA',
      'DEU',
      'ITA',
      'LUX',
      'MCO',
      'ESP',
      'SUR',
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

describe('borderBoxResults', () => {
  const andorraBorders = borderingCountries('AND')

  it('marks filled boxes right only if they name a new bordering country', () => {
    expect(borderBoxResults(['France', 'Portugal', 'france', 'Spain'], andorraBorders)).toEqual([
      true,
      false,
      false,
      true,
    ])
  })

  it('marks blank boxes wrong while unnamed neighbours are left, from the first', () => {
    // Andorra borders France and Spain: one blank box could have held France.
    expect(borderBoxResults(['Spain', '', '', ''], andorraBorders)).toEqual([
      true,
      false,
      true,
      true,
    ])
  })

  it('counts wrong answers as guesses, so they leave fewer blanks wrong', () => {
    expect(borderBoxResults(['Portugal', '', '', ''], andorraBorders)).toEqual([
      false,
      false,
      true,
      true,
    ])
    expect(borderBoxResults(['Portugal', 'Spain', '', ''], andorraBorders)).toEqual([
      false,
      true,
      true,
      true,
    ])
  })

  it('marks blanks right when there were more guesses than neighbours', () => {
    expect(borderBoxResults(['Portugal', 'Italy', 'Germany', ''], andorraBorders)).toEqual([
      false,
      false,
      false,
      true,
    ])
  })

  it('marks every blank wrong when the country has more neighbours than boxes', () => {
    expect(borderBoxResults(['', '', '', ''], borderingCountries('FRA'))).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it('marks every blank right once every neighbour is named', () => {
    expect(borderBoxResults(['france', 'Spain', '', ''], andorraBorders)).toEqual([
      true,
      true,
      true,
      true,
    ])
  })

  it('counts a box of only spaces as blank', () => {
    expect(
      borderBoxResults(['  ', 'Spain', 'Germany', 'Italy'], borderingCountries('FRA')),
    ).toEqual([false, true, true, true])
  })
})
