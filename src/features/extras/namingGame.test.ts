import { describe, expect, it } from 'vitest'
import { COUNTRY_COUNT } from '../passport/passport'
import { formatElapsedTime, namedCountry, remainingCountryNames } from './namingGame'

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
    const names = remainingCountryNames([])
    expect(names).toHaveLength(COUNTRY_COUNT)
    expect(names[0]).toBe('Afghanistan')
    expect(names.indexOf('The Bahamas')).toBe(names.indexOf('Bahrain') - 1)
  })

  it('leaves out the countries already named', () => {
    const names = remainingCountryNames(['AFG', 'PER'])
    expect(names).toHaveLength(COUNTRY_COUNT - 2)
    expect(names).not.toContain('Afghanistan')
    expect(names).not.toContain('Peru')
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
