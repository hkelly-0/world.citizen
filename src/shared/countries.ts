// Also used by scripts/make-country-images.mjs, which Node runs directly, so
// this file must only use TypeScript that Node can strip (no enums etc.).
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Geometry } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import worldAtlas50m from 'world-atlas/countries-50m.json' with { type: 'json' }
import tuvaluOutline from '../data/tuvaluOutline.json' with { type: 'json' }

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

// Returns the full-detail 1:50m outlines, plus Tuvalu from the 1:10m data
// (scripts/make-tuvalu-outline.mjs), because the 1:50m data leaves it out.
// MapLibre simplifies them itself for each zoom level, so they don't need
// simplifying here.
export function loadCountryShapes(): CountryShape[] {
  // The JSON import is untyped, so we tell TypeScript its TopoJSON shape.
  const topology = worldAtlas50m as unknown as WorldAtlasTopology
  const countries = feature(topology, topology.objects.countries)

  const shapes = countries.features.map((country) => {
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

  shapes.push({
    name: 'Tuvalu',
    isoNumeric: '798',
    isoAlpha3: 'TUV',
    geometry: tuvaluOutline as Geometry,
  })
  return shapes
}
