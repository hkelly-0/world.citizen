import { describe, expect, it } from 'vitest'
import { countryFacts } from './countryFacts'
import {
  AREA_RANGES,
  areaStat,
  formatIhdi,
  formatLargeNumber,
  IHDI_RANGES,
  ihdiStat,
  NO_DATA,
  POPULATION_RANGES,
  populationStat,
  rangeOf,
  roundWithinRange,
} from './statRanges'

describe('rangeOf', () => {
  it('puts population values in the right range', () => {
    expect(rangeOf(POPULATION_RANGES, 501).name).toBe('Minute')
    expect(rangeOf(POPULATION_RANGES, 500_000).name).toBe('Few')
    expect(rangeOf(POPULATION_RANGES, 5_000_000).name).toBe('Smallish')
    expect(rangeOf(POPULATION_RANGES, 30_000_000).name).toBe('Moderate')
    expect(rangeOf(POPULATION_RANGES, 66_650_804).name).toBe('Numerous')
    expect(rangeOf(POPULATION_RANGES, 347_000_000).name).toBe('Multitudes')
    expect(rangeOf(POPULATION_RANGES, 1_463_865_525).name).toBe('Billions')
  })

  it('puts area values in the right range', () => {
    expect(rangeOf(AREA_RANGES, 0.44).name).toBe('Minuscule')
    expect(rangeOf(AREA_RANGES, 50_000).name).toBe('Tiny')
    expect(rangeOf(AREA_RANGES, 200_000).name).toBe('Small')
    expect(rangeOf(AREA_RANGES, 551_695).name).toBe('Medium')
    expect(rangeOf(AREA_RANGES, 2_000_000).name).toBe('Large')
    expect(rangeOf(AREA_RANGES, 9_706_961).name).toBe('Immense')
  })

  it('puts IHDI values in the range given by multiplying by 10 and rounding', () => {
    expect(rangeOf(IHDI_RANGES, 0.226).name).toBe('Very Awful')
    expect(rangeOf(IHDI_RANGES, 0.3).name).toBe('Awful')
    expect(rangeOf(IHDI_RANGES, 0.64).name).toBe('Ok')
    expect(rangeOf(IHDI_RANGES, 0.65).name).toBe('Good')
    expect(rangeOf(IHDI_RANGES, 0.836).name).toBe('Great')
    expect(rangeOf(IHDI_RANGES, 0.923).name).toBe('Excellent')
    expect(rangeOf(IHDI_RANGES, 0.95).name).toBe('Fantastic')
  })

  it('matches multiplying by 10 and rounding for every country with an IHDI', () => {
    for (const country of Object.values(countryFacts)) {
      if (country.ihdi === null) continue
      const rounded = Math.round(country.ihdi * 10)
      expect(rangeOf(IHDI_RANGES, country.ihdi).bound).toBe(String(rounded))
    }
  })

  it('puts a value exactly on a boundary in the upper range', () => {
    expect(rangeOf(POPULATION_RANGES, 1_000_000).name).toBe('Smallish')
    expect(rangeOf(AREA_RANGES, 10_000).name).toBe('Tiny')
  })

  // Range questions tell their options apart by name.
  it('gives every range in a list a different name, none of them "No data"', () => {
    for (const ranges of [POPULATION_RANGES, AREA_RANGES, IHDI_RANGES]) {
      const names = ranges.map((range) => range.name)
      expect(new Set(names).size).toBe(names.length)
      expect(names).not.toContain(NO_DATA.name)
    }
  })

  it('lists ranges from smallest to largest, starting at 0', () => {
    for (const ranges of [POPULATION_RANGES, AREA_RANGES, IHDI_RANGES]) {
      expect(ranges[0].min).toBe(0)
      const minimums = ranges.map((range) => range.min)
      expect(minimums).toEqual([...minimums].sort((a, b) => a - b))
    }
  })

  it('puts only China and India in the "Billions" range', () => {
    const billions = Object.values(countryFacts)
      .filter((country) => rangeOf(POPULATION_RANGES, country.population).name === 'Billions')
      .map((country) => country.isoAlpha3)
    expect(billions.sort()).toEqual(['CHN', 'IND'])
  })
})

describe('formatLargeNumber', () => {
  it('rounds to 2 significant figures with a K, M or B suffix', () => {
    expect(formatLargeNumber(45_312_000)).toBe('45M')
    expect(formatLargeNumber(1_416_000_000)).toBe('1.4B')
    expect(formatLargeNumber(9_484_670)).toBe('9.5M')
    expect(formatLargeNumber(12_345)).toBe('12K')
    expect(formatLargeNumber(496)).toBe('500')
    expect(formatLargeNumber(0.44)).toBe('0.44')
  })

  it('moves up a suffix when rounding reaches it, and drops trailing zeros', () => {
    expect(formatLargeNumber(999_600)).toBe('1M')
    expect(formatLargeNumber(2_000_000)).toBe('2M')
  })
})

describe('formatIhdi', () => {
  it('multiplies by 10 and gives 2 significant figures', () => {
    expect(formatIhdi(0.543)).toBe('5.4')
    expect(formatIhdi(0.8)).toBe('8.0')
  })
})

describe('roundWithinRange', () => {
  it('rounds to 2 significant figures', () => {
    expect(roundWithinRange(POPULATION_RANGES, 66_650_804)).toBe(67_000_000)
    expect(roundWithinRange(AREA_RANGES, 551_695)).toBe(550_000)
  })

  it("rounds down when rounding up would reach the next range's minimum", () => {
    expect(roundWithinRange(POPULATION_RANGES, 99_924)).toBe(99_000)
    expect(roundWithinRange(AREA_RANGES, 299_600)).toBe(290_000)
    // Rounding up within the same range is fine.
    expect(roundWithinRange(POPULATION_RANGES, 99_400)).toBe(99_000)
    expect(roundWithinRange(POPULATION_RANGES, 1_960_000)).toBe(2_000_000)
  })

  it("keeps every country's rounded population and area in its own range", () => {
    for (const country of Object.values(countryFacts)) {
      const population = roundWithinRange(POPULATION_RANGES, country.population)
      expect(rangeOf(POPULATION_RANGES, population)).toBe(
        rangeOf(POPULATION_RANGES, country.population),
      )
      const area = roundWithinRange(AREA_RANGES, country.areaKm2)
      expect(rangeOf(AREA_RANGES, area)).toBe(rangeOf(AREA_RANGES, country.areaKm2))
    }
    expect(populationStat(countryFacts['VCT']).value).toBe('99K')
  })
})

describe('country stats', () => {
  it("gives each stat's range and rounded value", () => {
    const france = countryFacts['FRA']
    expect(areaStat(france)).toEqual({ range: rangeOf(AREA_RANGES, 551_695), value: '550K km²' })
    expect(populationStat(france).value).toBe('67M')
    expect(ihdiStat(france)).toEqual({
      range: rangeOf(IHDI_RANGES, 0.836),
      value: '8.4',
      isEstimate: false,
    })
  })

  it('marks an estimated IHDI, and gives null with no data', () => {
    expect(ihdiStat(countryFacts['SAU'])).toMatchObject({ value: '8.0 (est.)', isEstimate: true })
    expect(ihdiStat(countryFacts['VAT'])).toBeNull()
  })
})
