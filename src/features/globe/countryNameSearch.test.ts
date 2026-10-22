import { describe, expect, it } from 'vitest'
import { searchCountries } from './countryNameSearch'

function namesFound(typed: string): string[] {
  return searchCountries(typed).map((country) => country.commonName)
}

describe('searchCountries', () => {
  it('finds nothing until 3 letters are typed', () => {
    expect(namesFound('fr')).toEqual([])
    expect(namesFound('  fr ')).toEqual([])
    expect(namesFound('fra')).toEqual(['France'])
  })

  it('ignores case and accents', () => {
    expect(namesFound('TURK')).toEqual(['Türkiye', 'Turkmenistan'])
    expect(namesFound('sao')).toEqual(['São Tomé and Príncipe'])
  })

  it('matches the start of any word, after a space or hyphen', () => {
    expect(namesFound('kor')).toEqual(['North Korea', 'South Korea'])
    expect(namesFound('leste')).toEqual(['Timor-Leste'])
  })

  it('does not match the middle of a word', () => {
    expect(namesFound('land')).toEqual([])
  })

  it('lists names starting with the text before other word matches', () => {
    expect(namesFound('gui')).toEqual([
      'Guinea',
      'Guinea-Bissau',
      'Equatorial Guinea',
      'Papua New Guinea',
    ])
  })

  it('lists at most 6 suggestions', () => {
    // Andorra, plus every name with the word "and" (7 in all).
    const found = namesFound('and')
    expect(found).toHaveLength(6)
    expect(found[0]).toBe('Andorra')
  })
})
