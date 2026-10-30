// Also used by scripts/make-country-images.mjs, which Node runs directly, so
// this file must only use TypeScript that Node can strip (no enums etc.).
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Geometry, MultiPolygon, Polygon } from 'geojson'
import isoCountries from 'i18n-iso-countries'
import worldAtlas50m from 'world-atlas/countries-50m.json' with { type: 'json' }
import tuvaluOutline from '../data/tuvaluOutline.json' with { type: 'json' }
import farOffPartsJson from '../data/farOffParts.json' with { type: 'json' }
import { isPolygonInBox, type GeoBox } from './geoBox.ts'

// One country outline on the globe, identified by its ISO 3166-1 codes.
export type CountryShape = {
  name: string
  // ISO 3166-1 numeric code as used by world-atlas, e.g. "604" for Peru.
  // Null for areas without an official code (e.g. Kosovo, Somaliland).
  isoNumeric: string | null
  // ISO 3166-1 alpha-3 code, e.g. "PER". This is the key that will link
  // the globe to flashcards and the country facts dataset.
  isoAlpha3: string | null
  // For a far-off part split from one of the 195 (farOffParts.json, e.g.
  // French Guiana), that country's ISO alpha-3 code; otherwise null. Such a
  // part has no codes of its own, so the globe treats it as a territory, but
  // the flashcards and the land borders count it as its country.
  partOf: string | null
  geometry: Geometry
}

// The country a shape counts as in the flashcards: one of the 195, the
// country a far-off part belongs to, or another area's own code (null for
// areas without one).
export function countryCodeOfShape(
  shape: Pick<CountryShape, 'isoAlpha3' | 'partOf'>,
): string | null {
  return shape.isoAlpha3 ?? shape.partOf
}

// The country's whole outline: its own shape and its far-off parts (e.g.
// France with French Guiana), as one MultiPolygon. Used wherever the parts
// still count as the country: framing it (mainLandmass), its picture, its
// nearest countries and its land borders.
export function wholeCountryGeometry(shapes: CountryShape[], isoAlpha3: string): MultiPolygon {
  const polygons = shapes
    .filter((shape) => countryCodeOfShape(shape) === isoAlpha3)
    .flatMap((shape) => {
      const { geometry } = shape
      if (geometry.type === 'Polygon') return [geometry.coordinates]
      if (geometry.type === 'MultiPolygon') return geometry.coordinates
      throw new Error(`Unexpected geometry type ${geometry.type} for ${shape.name}`)
    })
  if (polygons.length === 0) throw new Error(`No outline for ${isoAlpha3}`)
  return { type: 'MultiPolygon', coordinates: polygons }
}

// Parts of a country far from its mainland, hand-written in farOffParts.json:
// every part of the `partOf` country's outline whose centre is inside the box
// becomes a shape of its own, called `name`. The box is [west, south, east,
// north] in degrees (see GeoBox).
type FarOffPart = { name: string; partOf: string; box: GeoBox }
const FAR_OFF_PARTS = farOffPartsJson as unknown as FarOffPart[]

// Natural Earth abbreviates some map names, e.g. "Falkland Is."; these are
// shown in full instead. Only areas outside the 195 countries need this, as
// the 195 show their name from the country facts.
const FULL_MAP_NAMES: Record<string, string> = {
  'N. Mariana Is.': 'Northern Mariana Islands',
  'U.S. Virgin Is.': 'U.S. Virgin Islands',
  'S. Geo. and the Is.': 'South Georgia and the South Sandwich Islands',
  'Br. Indian Ocean Ter.': 'British Indian Ocean Territory',
  'Pitcairn Is.': 'Pitcairn Islands',
  'Falkland Is.': 'Falkland Islands',
  'Cayman Is.': 'Cayman Islands',
  'British Virgin Is.': 'British Virgin Islands',
  'Turks and Caicos Is.': 'Turks and Caicos Islands',
  'Cook Is.': 'Cook Islands',
  'W. Sahara': 'Western Sahara',
  'St. Pierre and Miquelon': 'Saint Pierre and Miquelon',
  'Wallis and Futuna Is.': 'Wallis and Futuna Islands',
  'St-Martin': 'Saint Martin',
  'St-Barthélemy': 'Saint Barthélemy',
  'Fr. Polynesia': 'French Polynesia',
  'Fr. S. Antarctic Lands': 'French Southern and Antarctic Lands',
  'Faeroe Is.': 'Faroe Islands',
  'N. Cyprus': 'North Cyprus',
  'Indian Ocean Ter.': 'Australian Indian Ocean Territories',
  'Heard I. and McDonald Is.': 'Heard Island and McDonald Islands',
  'Ashmore and Cartier Is.': 'Ashmore and Cartier Islands',
}

// Natural Earth gives these map areas (by map name) the ISO code of the
// country they belong to, which would make them a second copy of that country
// (e.g. a second Australia in search, and in the scripts that look shapes up
// by code). They get no code instead, like the other territories.
const TERRITORIES_WITH_COUNTRY_CODES = new Set(['Ashmore and Cartier Is.'])

type WorldAtlasTopology = Topology<{
  countries: GeometryCollection<{ name: string }>
}>

// Returns the full-detail 1:50m outlines, plus Tuvalu from the 1:10m data
// (scripts/make-tuvalu-outline.mjs), because the 1:50m data leaves it out,
// and with the far-off parts (FAR_OFF_PARTS) split from their countries.
// MapLibre simplifies them itself for each zoom level, so they don't need
// simplifying here.
export function loadCountryShapes(): CountryShape[] {
  // The JSON import is untyped, so we tell TypeScript its TopoJSON shape.
  const topology = worldAtlas50m as unknown as WorldAtlasTopology
  const countries = feature(topology, topology.objects.countries)

  const shapes: CountryShape[] = countries.features.map((country) => {
    const isoNumeric =
      country.id === undefined || TERRITORIES_WITH_COUNTRY_CODES.has(country.properties.name)
        ? null
        : String(country.id)
    const isoAlpha3 =
      isoNumeric === null ? null : (isoCountries.numericToAlpha3(isoNumeric) ?? null)

    return {
      name: FULL_MAP_NAMES[country.properties.name] ?? country.properties.name,
      isoNumeric,
      isoAlpha3,
      partOf: null,
      geometry: country.geometry,
    }
  })

  shapes.push({
    name: 'Tuvalu',
    isoNumeric: '798',
    isoAlpha3: 'TUV',
    partOf: null,
    geometry: tuvaluOutline as Geometry,
  })

  for (const part of FAR_OFF_PARTS) {
    const country = shapes.find((shape) => shape.isoAlpha3 === part.partOf)
    if (country === undefined || country.geometry.type !== 'MultiPolygon') {
      throw new Error(`${part.name}: ${part.partOf} has no outline with several parts`)
    }
    const polygons = country.geometry.coordinates
    const inBox = (polygon: Polygon['coordinates']) => isPolygonInBox(polygon, part.box)
    // A box that catches nothing is a mistake in farOffParts.json.
    if (!polygons.some(inBox)) throw new Error(`${part.name}: no part of ${part.partOf} in its box`)
    country.geometry = {
      type: 'MultiPolygon',
      coordinates: polygons.filter((polygon) => !inBox(polygon)),
    }
    shapes.push({
      name: part.name,
      isoNumeric: null,
      isoAlpha3: null,
      partOf: part.partOf,
      geometry: { type: 'MultiPolygon', coordinates: polygons.filter(inBox) },
    })
  }
  return shapes
}
