import { describe, expect, it } from 'vitest'
import countryNeighboursJson from '../../data/countryNeighbours.json'
import flagSimilarityJson from '../../data/flagSimilarity.json'
import { countryFacts } from '../../shared/countryFacts'
import { FLAG_OPTION_COUNT, NEIGHBOUR_FLAGS_FROM, flagOptions } from './flagQuestion'

// Random numbers starting with `first` (which decides where the wrong flags
// come from), then Math.random.
function randomStartingWith(first: number): () => number {
  let isFirst = true
  return () => {
    if (!isFirst) return Math.random()
    isFirst = false
    return first
  }
}

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

  it('picks the wrong flags from the most similar-looking ones', () => {
    const similarToFrance = Object.keys(
      (flagSimilarityJson as Record<string, Record<string, number>>).FRA,
    )
    for (let i = 0; i < 20; i++) {
      for (const option of flagOptions('FRA', randomStartingWith(0.99))) {
        if (option !== 'FRA') expect(similarToFrance).toContain(option)
      }
    }
  })

  it('otherwise picks the wrong flags from the nearest countries', () => {
    const nearFrance = Object.keys(
      (countryNeighboursJson as Record<string, Record<string, number>>).FRA,
    ).slice(0, NEIGHBOUR_FLAGS_FROM)
    for (let i = 0; i < 20; i++) {
      for (const option of flagOptions('FRA', randomStartingWith(0))) {
        if (option !== 'FRA') expect(nearFrance).toContain(option)
      }
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
