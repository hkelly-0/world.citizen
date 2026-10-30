import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { COUNTRY_COUNT } from '../passport/passport'
import { formatElapsedTime, NAMING_AREAS, namedCountry, remainingCountryNames } from './namingGame'

const world = NAMING_AREAS[0]
const europe = NAMING_AREAS.find((area) => area.id === 'europe')!

describe('NAMING_AREAS', () => {
  it('starts with the whole world, then the continents A–Z', () => {
    expect(NAMING_AREAS.map((area) => area.name)).toEqual([
      'The World',
      'Africa',
      'Americas',
      'Asia',
      'Europe',
      'Oceania',
    ])
    expect(world.countries).toHaveLength(COUNTRY_COUNT)
  })

  it('puts each of the 195 countries in exactly one continent', () => {
    const continentCountries = NAMING_AREAS.slice(1).flatMap((area) => area.countries)
    expect([...continentCountries].sort()).toEqual(Object.keys(countryFacts).sort())
  })

  it('gives each area a centre to start the globe at', () => {
    for (const area of NAMING_AREAS) {
      expect(area.centre).toHaveLength(2)
    }
  })
})

describe('namedCountry', () => {
  it('accepts the common name, ignoring case, accents and surrounding spaces', () => {
    expect(namedCountry('  peru ')).toBe('PER')
    expect(namedCountry('turkiye')).toBe('TUR')
  })

  it('accepts the official name and hand-written alternatives', () => {
    expect(namedCountry('Republic of Peru')).toBe('PER')
    expect(namedCountry('Turkey')).toBe('TUR')
  })

  it('rejects names that are not countries', () => {
    expect(namedCountry('Atlantis')).toBeNull()
    expect(namedCountry('Per')).toBeNull()
  })
})

describe('remainingCountryNames', () => {
  it('lists every country A–Z, ignoring a leading "The"', () => {
    const names = remainingCountryNames(world, [])
    expect(names).toHaveLength(COUNTRY_COUNT)
    expect(names[0]).toBe('Afghanistan')
    expect(names.indexOf('The Bahamas')).toBe(names.indexOf('Bahrain') - 1)
  })

  it('leaves out the countries already named', () => {
    const names = remainingCountryNames(world, ['AFG', 'PER'])
    expect(names).toHaveLength(COUNTRY_COUNT - 2)
    expect(names).not.toContain('Afghanistan')
    expect(names).not.toContain('Peru')
  })

  it("lists only the area's countries", () => {
    const names = remainingCountryNames(europe, ['FRA'])
    expect(names).toHaveLength(europe.countries.length - 1)
    expect(names).toContain('Germany')
    expect(names).not.toContain('France')
    expect(names).not.toContain('Japan')
  })
})

describe('formatElapsedTime', () => {
  it('writes m:ss under an hour and h:mm:ss from an hour, rounding seconds down', () => {
    expect(formatElapsedTime(0)).toBe('0:00')
    expect(formatElapsedTime(7_999)).toBe('0:07')
    expect(formatElapsedTime(765_000)).toBe('12:45')
    expect(formatElapsedTime(3_723_000)).toBe('1:02:03')
  })
})
