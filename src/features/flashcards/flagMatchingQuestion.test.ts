import { describe, expect, it } from 'vitest'
import { flagMatchingCountries } from './flagMatchingQuestion'

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
