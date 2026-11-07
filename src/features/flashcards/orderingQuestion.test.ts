import { describe, expect, it } from 'vitest'
import { POPULATION_RANGES } from '../../shared/statRanges'
import { moveItem, orderingCountries, orderingTitle, swapItems } from './orderingQuestion'

describe('orderingTitle', () => {
  it("gives a country's range, and its place among the stat's ranges", () => {
    expect(orderingTitle('population', 'CHN')).toEqual({
      range: POPULATION_RANGES[6],
      rangeIndex: 6,
      isEstimate: false,
    })
    expect(POPULATION_RANGES[6].name).toBe('1.4 Billion')
    expect(orderingTitle('area', 'VAT')?.rangeIndex).toBe(0)
  })

  it('marks an estimated IHDI, and is null with no IHDI at all', () => {
    expect(orderingTitle('ihdi', 'DMA')?.isEstimate).toBe(true)
    expect(orderingTitle('ihdi', 'PRK')).toBeNull()
  })
})

describe('orderingCountries', () => {
  it('takes countries with different titles, highest first', () => {
    // Germany and France are both "≥ 50M" (Numerous); with random() always
    // 0 the Passport is gone through in order, so Germany is taken.
    expect(orderingCountries('population', ['DEU', 'FRA', 'CAN', 'USA', 'ISL'], () => 0)).toEqual([
      'USA',
      'DEU',
      'CAN',
      'ISL',
    ])
  })

  it('is null without 4 different titles in the Passport', () => {
    expect(orderingCountries('population', ['DEU', 'FRA', 'CAN', 'USA'])).toBeNull()
  })

  it('leaves out countries with no IHDI, but not estimated ones', () => {
    // North Korea has no IHDI; Dominica's is estimated.
    expect(orderingCountries('ihdi', ['PRK', 'SOM', 'DMA', 'CHN', 'USA'])).toEqual([
      'USA',
      'CHN',
      'DMA',
      'SOM',
    ])
    expect(orderingCountries('ihdi', ['PRK', 'SOM', 'DMA', 'CHN'])).toBeNull()
  })

  it('uses adjacent ranges over wider ones', () => {
    // Population ranges 0, 1, 2, 3 and 6: only 0 to 3 are adjacent, so China
    // is never asked.
    const passport = ['VAT', 'ISL', 'NZL', 'CAN', 'CHN']
    for (const point of [0, 0.25, 0.5, 0.75, 0.99]) {
      expect(orderingCountries('population', passport, () => point)).toEqual([
        'CAN',
        'NZL',
        'ISL',
        'VAT',
      ])
    }
  })

  it('uses the closest ranges when none are adjacent', () => {
    // Population ranges 0, 1, 3, 4 and 6: 0 to 4 is closer than 1 to 6.
    const passport = ['VAT', 'ISL', 'CAN', 'DEU', 'CHN']
    for (const point of [0, 0.25, 0.5, 0.75, 0.99]) {
      expect(orderingCountries('population', passport, () => point)).toEqual([
        'DEU',
        'CAN',
        'ISL',
        'VAT',
      ])
    }
  })

  it('picks between equally close ranges by how many countries they hold', () => {
    // Population ranges 0 to 3 hold 4 countries, and ranges 1 to 4 hold 6, so
    // the first random point picks the first set only below 4 / 10.
    const passport = ['VAT', 'ISL', 'NZL', 'CAN', 'DEU', 'FRA', 'ITA']
    const pickAt = (point: number) => {
      const points = [point]
      return orderingCountries('population', passport, () => points.shift() ?? 0)
    }
    expect(pickAt(0.39)).toEqual(['CAN', 'NZL', 'ISL', 'VAT'])
    expect(pickAt(0.41)).toEqual(['DEU', 'CAN', 'NZL', 'ISL'])
  })

  it('picks at random among the countries of a range', () => {
    // Germany, France and Italy are all in population range 4. The first
    // random point picks ranges 1 to 4, and the second the country in range 4.
    const passport = ['VAT', 'ISL', 'NZL', 'CAN', 'DEU', 'FRA', 'ITA']
    const pickAt = (point: number) => {
      const points = [0.5, point]
      return orderingCountries('population', passport, () => points.shift() ?? 0)?.[0]
    }
    expect(pickAt(0)).toBe('DEU')
    expect(pickAt(0.5)).toBe('FRA')
    expect(pickAt(0.9)).toBe('ITA')
  })
})

describe('moveItem', () => {
  it('moves an item, and the items between along by one', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
})

describe('swapItems', () => {
  it('swaps two items', () => {
    expect(swapItems(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['c', 'b', 'a', 'd'])
  })
})
