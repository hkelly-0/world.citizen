import { describe, expect, it } from 'vitest'
import { countryFacts } from './countryFacts'
import { AREA_RANGES, IHDI_RANGES, POPULATION_RANGES, rangeTitle } from './statRanges'

describe('rangeTitle', () => {
  it('puts population values in the right range', () => {
    expect(rangeTitle(POPULATION_RANGES, 501)).toBe('< 100K  /  Minute')
    expect(rangeTitle(POPULATION_RANGES, 500_000)).toBe('≥ 100K  /  Few')
    expect(rangeTitle(POPULATION_RANGES, 5_000_000)).toBe('≥ 1M  /  Smallish')
    expect(rangeTitle(POPULATION_RANGES, 30_000_000)).toBe('≥ 10M  /  Moderate')
    expect(rangeTitle(POPULATION_RANGES, 66_650_804)).toBe('≥ 50M  /  Numerous')
    expect(rangeTitle(POPULATION_RANGES, 347_000_000)).toBe('≥ 100M  /  Multitudes')
    expect(rangeTitle(POPULATION_RANGES, 1_463_865_525)).toBe('1.4 Billion')
  })

  it('puts area values in the right range', () => {
    expect(rangeTitle(AREA_RANGES, 0.44)).toBe('< 10K km²  /  Teensy-weensy')
    expect(rangeTitle(AREA_RANGES, 50_000)).toBe('≥ 10K km²  /  Tiny')
    expect(rangeTitle(AREA_RANGES, 200_000)).toBe('≥ 100K km²  /  Small')
    expect(rangeTitle(AREA_RANGES, 551_695)).toBe('≥ 300K km²  /  Medium')
    expect(rangeTitle(AREA_RANGES, 2_000_000)).toBe('≥ 1M km²  /  Large')
    expect(rangeTitle(AREA_RANGES, 9_706_961)).toBe('≥ 5M km²  /  Immense')
  })

  it('puts IHDI values in the range given by multiplying by 10 and rounding', () => {
    expect(rangeTitle(IHDI_RANGES, 0.226)).toBe('2  /  Very Awful')
    expect(rangeTitle(IHDI_RANGES, 0.3)).toBe('3  /  Awful')
    expect(rangeTitle(IHDI_RANGES, 0.64)).toBe('6  /  Ok')
    expect(rangeTitle(IHDI_RANGES, 0.65)).toBe('7  /  Good')
    expect(rangeTitle(IHDI_RANGES, 0.836)).toBe('8  /  Great')
    expect(rangeTitle(IHDI_RANGES, 0.923)).toBe('9  /  Excellent')
    expect(rangeTitle(IHDI_RANGES, 0.95)).toBe('10  /  Fantastic')
  })

  it('matches multiplying by 10 and rounding for every country with an IHDI', () => {
    for (const country of Object.values(countryFacts)) {
      if (country.ihdi === null) continue
      const rounded = Math.round(country.ihdi * 10)
      expect(rangeTitle(IHDI_RANGES, country.ihdi).startsWith(`${rounded}  /  `)).toBe(true)
    }
  })

  it('puts a value exactly on a boundary in the upper range', () => {
    expect(rangeTitle(POPULATION_RANGES, 1_000_000)).toBe('≥ 1M  /  Smallish')
    expect(rangeTitle(AREA_RANGES, 10_000)).toBe('≥ 10K km²  /  Tiny')
  })

  it('lists ranges from smallest to largest, starting at 0', () => {
    for (const ranges of [POPULATION_RANGES, AREA_RANGES, IHDI_RANGES]) {
      expect(ranges[0].min).toBe(0)
      const minimums = ranges.map((range) => range.min)
      expect(minimums).toEqual([...minimums].sort((a, b) => a - b))
    }
  })

  it('puts only China and India in the "1.4 Billion" range', () => {
    const billions = Object.values(countryFacts)
      .filter((country) => rangeTitle(POPULATION_RANGES, country.population) === '1.4 Billion')
      .map((country) => country.isoAlpha3)
    expect(billions.sort()).toEqual(['CHN', 'IND'])
  })
})
