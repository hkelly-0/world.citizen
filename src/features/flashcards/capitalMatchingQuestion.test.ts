import { describe, expect, it } from 'vitest'
import { capitalMatchingCountries, capitalsLabel } from './capitalMatchingQuestion'

describe('capitalMatchingCountries', () => {
  // France's 8 nearest countries include Switzerland, Spain and Italy; its
  // 9th to 15th include the UK, the Netherlands and Austria.
  it('takes the other countries from the 8 nearest in the Passport first', () => {
    const passport = ['FRA', 'JPN', 'GBR', 'ESP', 'CHE', 'ITA', 'NLD']
    const countries = capitalMatchingCountries(passport, null, () => 0)!
    expect(countries[0]).toBe('FRA')
    expect([...countries.slice(1)].sort()).toEqual(['CHE', 'ESP', 'ITA'])
  })

  it('then from the 15 nearest, then from the rest of the Passport', () => {
    const passport = ['FRA', 'JPN', 'BRA', 'GBR', 'ESP']
    const countries = capitalMatchingCountries(passport, null, () => 0)!
    // Spain, then the UK, then one of Japan and Brazil.
    expect(countries.slice(0, 3)).toEqual(['FRA', 'ESP', 'GBR'])
    expect(['JPN', 'BRA']).toContain(countries[3])
  })

  it('never starts from the previous first country', () => {
    expect(capitalMatchingCountries(['FRA', 'ESP', 'GBR', 'JPN'], 'FRA', () => 0)?.[0]).toBe('ESP')
  })

  it('is null with fewer than 4 countries in the Passport', () => {
    expect(capitalMatchingCountries(['FRA', 'ESP', 'GBR'], null)).toBeNull()
  })
})

describe('capitalsLabel', () => {
  it('lists every capital of a country with several', () => {
    expect(capitalsLabel('FRA')).toBe('Paris')
    expect(capitalsLabel('BOL')).toBe('Sucre, La Paz')
  })
})
