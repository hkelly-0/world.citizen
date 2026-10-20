import { feature } from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import worldAtlas50m from 'world-atlas/countries-50m.json'

// One country outline on the globe, identified by its ISO 3166-1 codes.
export type CountryShape = {
  name: string
  // ISO 3166-1 numeric code as used by world-atlas, e.g. "604" for Peru.
  // Null for areas without an official code (e.g. Kosovo, Somaliland).
  isoNumeric: string | null
  // ISO 3166-1 alpha-3 code, e.g. "PER". This is the key that will link
  // the globe to flashcards and the country facts dataset.
  isoAlpha3: string | null
  geometry: Geometry
}

type WorldAtlasTopology = Topology<{
  countries: GeometryCollection<{ name: string }>
}>

// The 1:50m borders have about 80,000 points, which is slow to draw on phones.
// Simplifying keeps roughly this fraction of them (about 15,000 points).
const FRACTION_OF_POINTS_TO_KEEP = 0.1

// Without this, small countries and islands (e.g. Vatican, Singapore, Malta)
// collapse to a line and disappear. Keeping the 3 most important points of
// every border segment guarantees each outline stays a real shape.
const MIN_POINTS_PER_BORDER_SEGMENT = 3

// Removes border points that barely change a country's outline. Shared borders
// are simplified once, so neighbouring countries still meet exactly.
function simplifyBorders(topology: WorldAtlasTopology): WorldAtlasTopology {
  // Gives every point a weight: how much the outline changes if it is removed.
  // The arc endpoints, where borders meet, get an infinite weight.
  const weighted = presimplify(topology)

  for (const arc of weighted.arcs) {
    const interiorPoints = arc.slice(1, -1)
    interiorPoints.sort((a, b) => b[2] - a[2])
    for (const point of interiorPoints.slice(0, MIN_POINTS_PER_BORDER_SEGMENT)) {
      point[2] = Infinity
    }
  }

  const minWeight = quantile(weighted, FRACTION_OF_POINTS_TO_KEEP)
  return simplify(weighted, minWeight)
}

// 'simplified' is for the globe.gl globe, which draws every point at all zooms.
// 'full' is for MapLibre, which simplifies the borders itself for each zoom level.
export type BorderDetail = 'simplified' | 'full'

export function loadCountryShapes(detail: BorderDetail = 'simplified'): CountryShape[] {
  // The JSON import is untyped, so we tell TypeScript its TopoJSON shape.
  const fullTopology = worldAtlas50m as unknown as WorldAtlasTopology
  const topology = detail === 'simplified' ? simplifyBorders(fullTopology) : fullTopology
  const countries = feature(topology, topology.objects.countries)

  return countries.features.map((country) => {
    const isoNumeric = country.id === undefined ? null : String(country.id)
    const isoAlpha3 =
      isoNumeric === null ? null : (isoCountries.numericToAlpha3(isoNumeric) ?? null)

    return {
      name: country.properties.name,
      isoNumeric,
      isoAlpha3,
      geometry: country.geometry,
    }
  })
}
