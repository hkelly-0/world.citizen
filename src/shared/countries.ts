import { feature } from 'topojson-client'
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

export function loadCountryShapes(): CountryShape[] {
  // The JSON import is untyped, so we tell TypeScript its TopoJSON shape.
  const topology = worldAtlas50m as unknown as WorldAtlasTopology
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
