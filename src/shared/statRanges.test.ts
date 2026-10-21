import { describe, expect, it } from 'vitest'
import { countryFacts } from './countryFacts'
import { AREA_RANGES, POPULATION_RANGES, rangeTitle } from './statRanges'

describe('rangeTitle', () => {
  it('puts population values in the right range', () => {
    expect(rangeTitle(POPULATION_RANGES, 501)).toBe('minute')
    expect(rangeTitle(POPULATION_RANGES, 500_000)).toBe('few')
    expect(rangeTitle(POPULATION_RANGES, 5_000_000)).toBe('smallish')
    expect(rangeTitle(POPULATION_RANGES, 30_000_000)).toBe('moderate')
    expect(rangeTitle(POPULATION_RANGES, 66_650_804)).toBe('numerous')
    expect(rangeTitle(POPULATION_RANGES, 347_000_000)).toBe('multitudes')
    expect(rangeTitle(POPULATION_RANGES, 1_463_865_525)).toBe('1.4 billion')
  })

  it('puts area values in the right range', () => {
    expect(rangeTitle(AREA_RANGES, 0.44)).toBe('teensy-weensy')
    expect(rangeTitle(AREA_RANGES, 50_000)).toBe('tiny')
    expect(rangeTitle(AREA_RANGES, 200_000)).toBe('small')
    expect(rangeTitle(AREA_RANGES, 551_695)).toBe('medium')
    expect(rangeTitle(AREA_RANGES, 2_000_000)).toBe('large')
    expect(rangeTitle(AREA_RANGES, 9_706_961)).toBe('immense')
  })

  it('puts a value exactly on a boundary in the upper range', () => {
    expect(rangeTitle(POPULATION_RANGES, 1_000_000)).toBe('smallish')
    expect(rangeTitle(AREA_RANGES, 10_000)).toBe('tiny')
  })

  it('lists ranges from smallest to largest, starting at 0', () => {
    for (const ranges of [POPULATION_RANGES, AREA_RANGES]) {
      expect(ranges[0].min).toBe(0)
      const minimums = ranges.map((range) => range.min)
      expect(minimums).toEqual([...minimums].sort((a, b) => a - b))
    }
  })

  it('puts only China and India in the "1.4 billion" range', () => {
    const billions = Object.values(countryFacts)
      .filter((country) => rangeTitle(POPULATION_RANGES, country.population) === '1.4 billion')
      .map((country) => country.isoAlpha3)
    expect(billions.sort()).toEqual(['CHN', 'IND'])
  })
})
