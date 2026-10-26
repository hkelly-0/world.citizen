import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { FLAG_OPTION_COUNT, flagOptions } from './flagQuestion'

describe('flagOptions', () => {
  it('offers the correct flag and different wrong ones, for every country', () => {
    for (const code of Object.keys(countryFacts)) {
      const options = flagOptions(code)

      expect(options).toHaveLength(FLAG_OPTION_COUNT)
      expect(options).toContain(code)
      expect(new Set(options).size).toBe(FLAG_OPTION_COUNT)
      for (const option of options) expect(countryFacts[option]).toBeDefined()
    }
  })

  it('still offers different flags when the random numbers repeat', () => {
    const options = flagOptions('FRA', () => 0.5)

    expect(new Set(options).size).toBe(FLAG_OPTION_COUNT)
    expect(options).toContain('FRA')
  })

  it('puts the correct flag at a random place', () => {
    expect(flagOptions('FRA', () => 0)[0]).toBe('FRA')
    expect(flagOptions('FRA', () => 0.99)[FLAG_OPTION_COUNT - 1]).toBe('FRA')
  })
})

describe('flag images', () => {
  it('exist for all 195 countries', () => {
    // Lists the files without loading them.
    const flagFiles = Object.keys(import.meta.glob('/public/flags/*.svg'))
    for (const code of Object.keys(countryFacts)) {
      expect(flagFiles, code).toContain(`/public/flags/${code}.svg`)
    }
  })
})
