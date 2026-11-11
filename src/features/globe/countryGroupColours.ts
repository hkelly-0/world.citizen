import { neighbors } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldAtlas50m from 'world-atlas/countries-50m.json' with { type: 'json' }
import countryGroupsJson from '../../data/countryGroups.json' with { type: 'json' }
import { worldAtlasAlpha3 } from '../../shared/countries.ts'

// Picks the colours of the country groups (src/data/countryGroups.json): the
// tint of the region globe, where new regions are chosen, and of the globe
// screen's Regions setting. Not used by the app itself:
// scripts/make-country-group-colours.mjs saves the colours to
// src/data/countryGroupColours.json, which the app reads. The JSON imports
// carry `with { type: 'json' }` so the script can import this file in Node.

type CountryGroup = { id: string; name: string; countries: string[] }
const COUNTRY_GROUPS: CountryGroup[] = countryGroupsJson

// Bright: fully saturated, mid lightness.
const SATURATION = 95
const LIGHTNESS = 55
// Hues tried for each group, this many degrees apart.
const HUE_STEP = 10

// For each group id, the ids of the groups next to it: groups whose countries
// share a land border, plus the groups just before and after it in
// countryGroups.json. The file lists groups region by region, so this also
// covers island groups that share no border (e.g. the Caribbean ones).
export function groupNeighbours(): Map<string, Set<string>> {
  const result = borderingGroups()
  COUNTRY_GROUPS.forEach((group, index) => {
    const next = COUNTRY_GROUPS[index + 1]
    if (next === undefined) return
    result.get(group.id)!.add(next.id)
    result.get(next.id)!.add(group.id)
  })
  return result
}

// For each group id, the ids of the groups whose countries share a land border
// with its countries.
export function borderingGroups(): Map<string, Set<string>> {
  const groupOfCountry = new Map<string, string>()
  const result = new Map<string, Set<string>>()
  for (const group of COUNTRY_GROUPS) {
    result.set(group.id, new Set())
    for (const code of group.countries) groupOfCountry.set(code, group.id)
  }
  function link(a: string | undefined, b: string | undefined) {
    if (a === undefined || b === undefined || a === b) return
    result.get(a)!.add(b)
    result.get(b)!.add(a)
  }

  // The JSON import is untyped, so we tell TypeScript its TopoJSON shape.
  const topology = worldAtlas50m as unknown as Topology<{ countries: GeometryCollection }>
  const shapes = topology.objects.countries.geometries
  // neighbors() lists, for each shape, the positions of the shapes it shares
  // a border with.
  const groupOfShape = shapes.map((shape) => {
    // Every world-atlas shape has a name.
    const { name } = shape.properties as { name: string }
    const alpha3 = worldAtlasAlpha3(shape.id, name)
    return alpha3 === undefined ? undefined : groupOfCountry.get(alpha3)
  })
  neighbors(shapes).forEach((bordering, index) => {
    for (const other of bordering) link(groupOfShape[index], groupOfShape[other])
  })
  return result
}

// Distance between two hues round the colour wheel, 0 to 180 degrees.
export function hueDistance(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360
  return Math.min(difference, 360 - difference)
}

// Picks a hue for each group that has none in `keptHues`, as far as possible
// from its neighbours' hues; groups in `keptHues` keep theirs. The new groups
// are coloured in a random order; each tries every HUE_STEP degrees (from a
// random start) and takes the hue furthest from the neighbours already
// coloured, with ties broken at random.
export function chooseGroupHues(
  neighbours: Map<string, Set<string>>,
  keptHues: Map<string, number> = new Map(),
  random: () => number = Math.random,
): Map<string, number> {
  const hues = new Map<string, number>()
  for (const [id, hue] of keptHues) if (neighbours.has(id)) hues.set(id, hue)
  const order = [...neighbours.keys()].filter((id) => !hues.has(id)).sort(() => random() - 0.5)
  const start = random() * 360
  for (const id of order) {
    let bestHues: number[] = []
    let bestDistance = -1
    for (let hue = start; hue < start + 360; hue += HUE_STEP) {
      let distance = 180
      for (const neighbour of neighbours.get(id)!) {
        const neighbourHue = hues.get(neighbour)
        if (neighbourHue !== undefined) {
          distance = Math.min(distance, hueDistance(hue, neighbourHue))
        }
      }
      if (distance > bestDistance) {
        bestHues = [hue % 360]
        bestDistance = distance
      } else if (distance === bestDistance) {
        bestHues.push(hue % 360)
      }
    }
    hues.set(id, bestHues[Math.floor(random() * bestHues.length)])
  }
  return hues
}

// The CSS colour saved for a hue, e.g. "hsl(210, 95%, 55%)".
export function hueToColour(hue: number): string {
  return `hsl(${Math.round(hue)}, ${SATURATION}%, ${LIGHTNESS}%)`
}

// The hue of a saved colour, or null if it isn't written as hsl(...).
export function colourToHue(colour: string): number | null {
  const match = /^hsl\(\s*(\d+(?:\.\d+)?)/.exec(colour)
  return match === null ? null : Number(match[1])
}
