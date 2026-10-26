import { describe, expect, it } from 'vitest'
import { moveItem, orderingCountries, orderingTitle, swapItems } from './orderingQuestion'

describe('orderingTitle', () => {
  it("gives a country's range title, and its place among the stat's ranges", () => {
    expect(orderingTitle('population', 'CHN')).toEqual({
      title: '1.4 Billion',
      rangeIndex: 6,
      isEstimate: false,
    })
    expect(orderingTitle('area', 'VAT')?.rangeIndex).toBe(0)
  })

  it('marks an estimated IHDI, and is null with no IHDI at all', () => {
    expect(orderingTitle('ihdi', 'DMA')?.isEstimate).toBe(true)
    expect(orderingTitle('ihdi', 'PRK')).toBeNull()
  })
})

describe('orderingCountries', () => {
  it('takes countries with different titles, highest first', () => {
    // Germany and France are both "≥ 50M  /  Numerous"; with random() always
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
