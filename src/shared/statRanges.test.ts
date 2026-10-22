import { describe, expect, it } from 'vitest'
import { countryFacts } from './countryFacts'
import { AREA_RANGES, IHDI_RANGES, POPULATION_RANGES, rangeTitle } from './statRanges'

describe('rangeTitle', () => {
  it('puts population values in the right range', () => {
    expect(rangeTitle(POPULATION_RANGES, 501)).toBe('Minute - < 100K')
    expect(rangeTitle(POPULATION_RANGES, 500_000)).toBe('Few - ≥ 100K')
    expect(rangeTitle(POPULATION_RANGES, 5_000_000)).toBe('Smallish - ≥ 1M')
    expect(rangeTitle(POPULATION_RANGES, 30_000_000)).toBe('Moderate - ≥ 10M')
    expect(rangeTitle(POPULATION_RANGES, 66_650_804)).toBe('Numerous - ≥ 50M')
    expect(rangeTitle(POPULATION_RANGES, 347_000_000)).toBe('Multitudes - ≥ 100M')
    expect(rangeTitle(POPULATION_RANGES, 1_463_865_525)).toBe('1.4 Billion')
  })

  it('puts area values in the right range', () => {
    expect(rangeTitle(AREA_RANGES, 0.44)).toBe('Teensy-weensy - < 10K km²')
    expect(rangeTitle(AREA_RANGES, 50_000)).toBe('Tiny - ≥ 10K km²')
    expect(rangeTitle(AREA_RANGES, 200_000)).toBe('Small - ≥ 100K km²')
    expect(rangeTitle(AREA_RANGES, 551_695)).toBe('Medium - ≥ 300K km²')
    expect(rangeTitle(AREA_RANGES, 2_000_000)).toBe('Large - ≥ 1M km²')
    expect(rangeTitle(AREA_RANGES, 9_706_961)).toBe('Immense - ≥ 5M km²')
  })

  it('puts IHDI values in the range given by multiplying by 10 and rounding', () => {
    expect(rangeTitle(IHDI_RANGES, 0.226)).toBe('Very Awful - 2')
    expect(rangeTitle(IHDI_RANGES, 0.3)).toBe('Awful - 3')
    expect(rangeTitle(IHDI_RANGES, 0.64)).toBe('Ok - 6')
    expect(rangeTitle(IHDI_RANGES, 0.65)).toBe('Good - 7')
    expect(rangeTitle(IHDI_RANGES, 0.836)).toBe('Great - 8')
    expect(rangeTitle(IHDI_RANGES, 0.923)).toBe('Excellent - 9')
    expect(rangeTitle(IHDI_RANGES, 0.95)).toBe('Fantastic - 10')
  })

  it('matches multiplying by 10 and rounding for every country with an IHDI', () => {
    for (const country of Object.values(countryFacts)) {
      if (country.ihdi === null) continue
      const rounded = Math.round(country.ihdi * 10)
      expect(rangeTitle(IHDI_RANGES, country.ihdi).endsWith(` - ${rounded}`)).toBe(true)
    }
  })

  it('puts a value exactly on a boundary in the upper range', () => {
    expect(rangeTitle(POPULATION_RANGES, 1_000_000)).toBe('Smallish - ≥ 1M')
    expect(rangeTitle(AREA_RANGES, 10_000)).toBe('Tiny - ≥ 10K km²')
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
