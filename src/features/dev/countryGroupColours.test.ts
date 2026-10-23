import { describe, expect, it } from 'vitest'
import { chooseCountryGroupColours, chooseGroupHues, groupNeighbours } from './countryGroupColours'

describe('groupNeighbours', () => {
  it('links groups that share a land border, both ways', () => {
    const neighbours = groupNeighbours()
    expect(neighbours.get('east-asia')?.has('eastern-europe')).toBe(true)
    expect(neighbours.get('eastern-europe')?.has('east-asia')).toBe(true)
  })

  it('links groups listed next to each other, so island groups have neighbours', () => {
    expect(groupNeighbours().get('leeward-islands')?.has('southern-caribbean')).toBe(true)
  })
})

describe('chooseGroupHues', () => {
  it('keeps every pair of neighbouring groups clearly apart in hue', () => {
    const neighbours = groupNeighbours()
    for (let run = 0; run < 20; run++) {
      const hues = chooseGroupHues(neighbours)
      for (const [id, others] of neighbours) {
        for (const other of others) {
          const difference = Math.abs(hues.get(id)! - hues.get(other)!) % 360
          expect(Math.min(difference, 360 - difference), `${id} / ${other}`).toBeGreaterThan(10)
        }
      }
    }
  })
})

describe('chooseCountryGroupColours', () => {
  it('gives all 195 countries a colour, shared within each group', () => {
    const colours = chooseCountryGroupColours()
    expect(Object.keys(colours).length).toBe(195)
    expect(colours['NOR']).toBe(colours['SWE'])
  })
})
