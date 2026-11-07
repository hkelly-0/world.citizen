import { describe, expect, it } from 'vitest'
import groupColoursJson from '../../data/countryGroupColours.json'
import { COUNTRY_GROUPS } from '../../shared/countryFacts'
import {
  borderingGroups,
  chooseGroupHues,
  colourToHue,
  groupNeighbours,
  hueDistance,
  hueToColour,
} from './countryGroupColours'

const savedColours: Record<string, string> = groupColoursJson

function expectNeighboursApart(hues: Map<string, number>, neighbours: Map<string, Set<string>>) {
  for (const [id, others] of neighbours) {
    for (const other of others) {
      expect(hueDistance(hues.get(id)!, hues.get(other)!), `${id} / ${other}`).toBeGreaterThan(10)
    }
  }
}

describe('groupNeighbours', () => {
  it('links groups that share a land border, both ways', () => {
    const neighbours = groupNeighbours()
    expect(neighbours.get('east-asia')?.has('russia-steppe')).toBe(true)
    expect(neighbours.get('russia-steppe')?.has('east-asia')).toBe(true)
  })

  it('links groups listed next to each other, so island groups have neighbours', () => {
    expect(groupNeighbours().get('leeward-islands')?.has('southern-caribbean')).toBe(true)
  })
})

describe('borderingGroups', () => {
  it('links only groups that share a land border', () => {
    const bordering = borderingGroups()
    expect(bordering.get('east-asia')?.has('russia-steppe')).toBe(true)
    expect(bordering.get('leeward-islands')?.size).toBe(0)
  })
})

describe('chooseGroupHues', () => {
  it('keeps every pair of neighbouring groups clearly apart in hue', () => {
    const neighbours = groupNeighbours()
    for (let run = 0; run < 20; run++)
      expectNeighboursApart(chooseGroupHues(neighbours), neighbours)
  })

  it('keeps the hues it is given and picks the rest', () => {
    const neighbours = groupNeighbours()
    const hues = chooseGroupHues(neighbours, new Map([['nordic', 123]]))
    expect(hues.get('nordic')).toBe(123)
    expect(hues.size).toBe(COUNTRY_GROUPS.length)
  })
})

describe('hueToColour and colourToHue', () => {
  it('write a hue as hsl(...) and read it back', () => {
    expect(colourToHue(hueToColour(210))).toBe(210)
    expect(colourToHue('#ff0000')).toBe(null)
  })
})

describe('the saved colours (countryGroupColours.json)', () => {
  it('give exactly the groups a colour each', () => {
    expect(Object.keys(savedColours).sort()).toEqual(COUNTRY_GROUPS.map((group) => group.id).sort())
  })

  // Only bordering groups: colours can be edited by hand, and groups that are
  // merely listed next to each other may be far apart on the map.
  it('keep bordering groups clearly apart in hue', () => {
    const hues = new Map(
      Object.entries(savedColours).map(([id, colour]) => [id, colourToHue(colour)!]),
    )
    expectNeighboursApart(hues, borderingGroups())
  })
})
