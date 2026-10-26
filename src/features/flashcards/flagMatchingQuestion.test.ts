import { describe, expect, it } from 'vitest'
import { flagMatchingCountries, placeName, shuffled } from './flagMatchingQuestion'

describe('flagMatchingCountries', () => {
  // Chad's most similar flags are Romania, Moldova, Belgium, Andorra, Guinea, Mali.
  const passport = ['TCD', 'MLI', 'BEL', 'JPN', 'ROU', 'GIN']

  it('takes the 3 Passport countries with the flags most like the first one', () => {
    // Picks the first Passport country, Chad. Moldova and Andorra aren't in the Passport.
    expect(flagMatchingCountries(passport, null, () => 0)).toEqual(['TCD', 'ROU', 'BEL', 'GIN'])
  })

  it('never starts from the previous first country', () => {
    expect(flagMatchingCountries(passport, 'TCD', () => 0)?.[0]).toBe('MLI')
  })

  it('is null with fewer than 4 countries in the Passport', () => {
    expect(flagMatchingCountries(['TCD', 'ROU', 'BEL'], null)).toBeNull()
  })
})

describe('shuffled', () => {
  it('keeps every item, in an order chosen by `random`', () => {
    expect(shuffled(['a', 'b', 'c'], () => 0)).toEqual(['a', 'b', 'c'])
    expect(shuffled(['a', 'b', 'c'], () => 0.99)).toEqual(['c', 'b', 'a'])
  })
})

describe('placeName', () => {
  it('puts a name on an empty flag', () => {
    expect(placeName([null, null], 'FRA', 1)).toEqual([null, 'FRA'])
  })

  it('moves a name from one flag to an empty one', () => {
    expect(placeName(['FRA', null], 'FRA', 1)).toEqual([null, 'FRA'])
  })

  it('swaps two names on flags', () => {
    expect(placeName(['FRA', 'ITA'], 'FRA', 1)).toEqual(['ITA', 'FRA'])
  })

  it("takes a flag's name off when another name not on a flag is put there", () => {
    expect(placeName(['FRA', null], 'ITA', 0)).toEqual(['ITA', null])
  })

  it('takes a name off its flag when moved to no flag', () => {
    expect(placeName(['FRA', 'ITA'], 'ITA', null)).toEqual(['FRA', null])
  })
})
