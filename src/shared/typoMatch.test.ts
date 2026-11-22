import { describe, expect, it } from 'vitest'
import { allowedTypos, answerOption, matchAnswer, startsWithTypos, typoDistance } from './typoMatch'

describe('typoDistance', () => {
  it('is 0 for the same text', () => {
    expect(typoDistance('benin', 'benin')).toBe(0)
  })

  it('counts each letter added, left out, or changed as one typo', () => {
    expect(typoDistance('benn', 'benin')).toBe(1)
    expect(typoDistance('beniin', 'benin')).toBe(1)
    expect(typoDistance('benan', 'benin')).toBe(1)
    expect(typoDistance('', 'benin')).toBe(5)
  })

  it('counts two neighbouring letters swapped as one typo', () => {
    expect(typoDistance('bnein', 'benin')).toBe(1)
    expect(typoDistance('beinn', 'benin')).toBe(1)
  })
})

describe('allowedTypos', () => {
  it('allows none up to 4 letters, one up to 8, and two after', () => {
    expect(allowedTypos('iran')).toBe(0)
    expect(allowedTypos('malta')).toBe(1)
    expect(allowedTypos('slovakia')).toBe(1)
    expect(allowedTypos('cape town')).toBe(2)
  })
})

describe('matchAnswer', () => {
  const OPTIONS = [
    answerOption('A', ['Austria']),
    answerOption('B', ['Australia', 'Commonwealth of Australia']),
    answerOption('C', ['Shared']),
    answerOption('D', ['Shared']),
    answerOption('E', ['Niger']),
    answerOption('F', ['Nigeria']),
  ]

  it('finds an exact match, ignoring case, accents, and surrounding spaces', () => {
    expect(matchAnswer('  AUSTRÍA ', OPTIONS)).toEqual([{ key: 'A', name: 'Austria' }])
  })

  it('finds every option sharing an exact name', () => {
    expect(matchAnswer('shared', OPTIONS).map((match) => match.key)).toEqual(['C', 'D'])
  })

  it('accepts a typo, giving the name it was a typo of', () => {
    expect(matchAnswer('Austrailia', OPTIONS)).toEqual([{ key: 'B', name: 'Australia' }])
    expect(matchAnswer('Commonwealth of Astralia', OPTIONS)).toEqual([
      { key: 'B', name: 'Commonwealth of Australia' },
    ])
  })

  it('rejects more typos than allowed', () => {
    expect(matchAnswer('Ostrya', OPTIONS)).toEqual([])
  })

  it('rejects a typo as close to two options', () => {
    // One letter from both Niger and Nigeria.
    expect(matchAnswer('Nigera', OPTIONS)).toEqual([])
  })

  it('rejects an empty answer', () => {
    expect(matchAnswer('  ', OPTIONS)).toEqual([])
  })
})

describe('startsWithTypos', () => {
  it('matches the start of a name with a typo, longer or shorter than it', () => {
    expect(startsWithTypos('australia', 'austrl')).toBe(true)
    expect(startsWithTypos('australia', 'austrail')).toBe(true)
    expect(startsWithTypos('australia', 'asutra')).toBe(true)
  })

  it('allows no typos in text up to 4 letters', () => {
    expect(startsWithTypos('australia', 'asut')).toBe(false)
  })

  it('rejects text too far from the start of the name', () => {
    expect(startsWithTypos('australia', 'brazil')).toBe(false)
  })
})
