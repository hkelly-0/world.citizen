import { neighbors } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import isoCountries from 'i18n-iso-countries'
import worldAtlas50m from 'world-atlas/countries-50m.json'
import { COUNTRY_GROUPS } from '../../shared/countryFacts'

// Colours for the dev option that tints every globe by country group
// (src/data/countryGroups.json). Not part of the app itself.

// Whether the globes show the group colours. Kept in memory only, so a reload
// turns it off. Globes read it when they are created; the dev menu remounts
// the current screen after changing it.
let areGroupsShown = false

export function areCountryGroupsShown(): boolean {
  return areGroupsShown
}

export function setCountryGroupsShown(shown: boolean) {
  areGroupsShown = shown
}

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

  COUNTRY_GROUPS.forEach((group, index) => link(group.id, COUNTRY_GROUPS[index + 1]?.id))

  // The JSON import is untyped, so we tell TypeScript its TopoJSON shape.
  const topology = worldAtlas50m as unknown as Topology<{ countries: GeometryCollection }>
  const shapes = topology.objects.countries.geometries
  // neighbors() lists, for each shape, the positions of the shapes it shares
  // a border with.
  const groupOfShape = shapes.map((shape) => {
    const alpha3 = shape.id === undefined ? undefined : isoCountries.numericToAlpha3(shape.id)
    return alpha3 === undefined ? undefined : groupOfCountry.get(alpha3)
  })
  neighbors(shapes).forEach((bordering, index) => {
    for (const other of bordering) link(groupOfShape[index], groupOfShape[other])
  })
  return result
}

// Distance between two hues round the colour wheel, 0 to 180 degrees.
function hueDistance(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360
  return Math.min(difference, 360 - difference)
}

// Picks a hue for each group, as far as possible from its neighbours' hues.
// Groups are coloured in a random order; each tries every HUE_STEP degrees
// (from a random start) and takes the hue furthest from the neighbours
// already coloured, with ties broken at random.
export function chooseGroupHues(
  neighbours: Map<string, Set<string>>,
  random: () => number = Math.random,
): Map<string, number> {
  const hues = new Map<string, number>()
  const order = [...neighbours.keys()].sort(() => random() - 0.5)
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

// A colour for each of the 195 countries, keyed by ISO alpha-3 code: its
// group's colour. Different on every page load.
export function chooseCountryGroupColours(): Record<string, string> {
  const hues = chooseGroupHues(groupNeighbours())
  const colours: Record<string, string> = {}
  for (const group of COUNTRY_GROUPS) {
    const colour = `hsl(${Math.round(hues.get(group.id)!)}, ${SATURATION}%, ${LIGHTNESS}%)`
    for (const code of group.countries) colours[code] = colour
  }
  return colours
}
