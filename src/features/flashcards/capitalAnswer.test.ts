import { describe, expect, it } from 'vitest'
import { isCapitalCorrect } from './capitalAnswer'

describe('isCapitalCorrect', () => {
  it('accepts an exact match', () => {
    expect(isCapitalCorrect('Paris', ['Paris'])).toBe(true)
  })

  it('ignores case, accents and spaces at either end', () => {
    expect(isCapitalCorrect('  bogota ', ['Bogotá'])).toBe(true)
    expect(isCapitalCorrect('REYKJAVIK', ['Reykjavík'])).toBe(true)
  })

  it('rejects any other spelling difference', () => {
    expect(isCapitalCorrect('Pari', ['Paris'])).toBe(false)
    expect(isCapitalCorrect('Sanaa', ["Sana'a"])).toBe(false)
  })

  it('accepts any one of several capitals', () => {
    const capitals = ['Pretoria', 'Bloemfontein', 'Cape Town']
    expect(isCapitalCorrect('Cape Town', capitals)).toBe(true)
    expect(isCapitalCorrect('Johannesburg', capitals)).toBe(false)
  })
})
