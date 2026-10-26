import { describe, expect, it } from 'vitest'
import { placeLabel } from './matchingQuestion'

describe('placeLabel', () => {
  it('puts a label on an empty target', () => {
    expect(placeLabel([null, null], 'FRA', 1)).toEqual([null, 'FRA'])
  })

  it('moves a label from one target to an empty one', () => {
    expect(placeLabel(['FRA', null], 'FRA', 1)).toEqual([null, 'FRA'])
  })

  it('swaps two labels on targets', () => {
    expect(placeLabel(['FRA', 'ITA'], 'FRA', 1)).toEqual(['ITA', 'FRA'])
  })

  it("takes a target's label off when another label not on a target is put there", () => {
    expect(placeLabel(['FRA', null], 'ITA', 0)).toEqual(['ITA', null])
  })

  it('takes a label off its target when moved to no target', () => {
    expect(placeLabel(['FRA', 'ITA'], 'ITA', null)).toEqual(['FRA', null])
  })
})
