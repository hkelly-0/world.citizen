import { describe, expect, it } from 'vitest'
import {
  borderBoxResults,
  borderingCountries,
  markBorderAnswers,
  nextRoundBoxCount,
  nextRoundPrompt,
  remainingBorders,
} from './bordersQuestion'

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

  it('matches names ignoring case, accents, and surrounding spaces', () => {
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

describe('remainingBorders', () => {
  it('leaves out the neighbours named in earlier rounds', () => {
    const germanyBorders = borderingCountries('DEU')
    expect(
      remainingBorders([['austria', 'Belgium', 'Czechia', 'Denmark']], germanyBorders),
    ).toEqual(['FRA', 'LUX', 'NLD', 'POL', 'CHE'])
  })
})

describe('nextRoundBoxCount', () => {
  const germanyBorders = borderingCountries('DEU')

  it('offers 4 more boxes, or as many as are left, after an all-right round', () => {
    expect(nextRoundBoxCount(['Austria', 'Belgium', 'Czechia', 'Denmark'], germanyBorders)).toBe(4)
    const remaining = remainingBorders(
      [['Austria', 'Belgium', 'Czechia', 'Denmark']],
      germanyBorders,
    )
    expect(nextRoundBoxCount(['France', 'Luxembourg', 'Netherlands', 'Poland'], remaining)).toBe(1)
  })

  it('ends the question after a wrong box', () => {
    expect(nextRoundBoxCount(['Austria', 'Belgium', 'Czechia', ''], germanyBorders)).toBe(0)
    expect(nextRoundBoxCount(['Austria', 'Belgium', 'Czechia', 'Spain'], germanyBorders)).toBe(0)
  })

  it('ends the question once every neighbour is named', () => {
    expect(nextRoundBoxCount(['France', 'Spain', '', ''], borderingCountries('AND'))).toBe(0)
  })
})

describe('nextRoundPrompt', () => {
  it('asks for 4 more while more than 4 are left, then the last ones', () => {
    expect(nextRoundPrompt(5)).toBe('Nice. 4 more?')
    expect(nextRoundPrompt(4)).toBe('Nice. Last 4?')
    expect(nextRoundPrompt(1)).toBe('Nice. Last 1?')
  })
})
