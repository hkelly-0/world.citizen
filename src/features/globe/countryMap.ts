import {
  Map as MapLibreMap,
  Point,
  setWorkerUrl,
  type LayerSpecification,
  type PointLike,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre prepares map tiles in a background worker. It looks for the worker
// script next to its own file, which doesn't exist once Vite has bundled the
// app, so Vite copies the script and we tell MapLibre where it is.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, Geometry, Position } from 'geojson'
import { loadCountryShapes, wholeCountryGeometry } from '../../shared/countries'
import { countryFacts } from '../../shared/countryFacts'
import groupColoursJson from '../../data/countryGroupColours.json'
import { prepareGeometryForFlatMap } from './flatMapGeometry'
import { focusZoomFor, WIDE_SCREEN_MIN_PX } from './focusZoom'
import { mainLandmassCentre, mainLandmassWidthKm } from './mainLandmass'
import { regionBounds, regionCentre, regionWidthKm } from './regionBounds'
import {
  chooseTappedIndex,
  distanceToOutlinePx,
  tapBufferPxFor,
  VERY_SMALL_AREA_KM2,
  type ScreenPoint,
} from './tapBuffer'
import { zoomLimitsFor } from './zoomLimits'

setWorkerUrl(maplibreWorkerUrl)

// Phones and tablets can't hover, so hover highlighting is only set up on
// devices with a mouse or trackpad.
const CAN_HOVER = window.matchMedia('(hover: hover)').matches

// Higher pixel ratios look marginally sharper but are slow in Android WebView.
// 1.5 made the population lights look blocky on phones.
const MAX_PIXEL_RATIO = 2

// Only shown where the background imagery doesn't reach (beyond about 85°N/S).
const OCEAN_COLOR = '#16324f'
const HOVERED_COLOR = '#ffffff'
const HOVERED_OPACITY = 0.2
const SELECTED_COLOR = '#ffc83c'
const SELECTED_OPACITY = 0.45
// Used by the flashcards' "select the country" question.
const CORRECT_COLOR = '#3fb950'
// The same red as --wrong-red in index.css (MapLibre can't read CSS variables).
const WRONG_COLOR = '#f85149'
const ANSWER_OPACITY = 0.55
const BORDER_COLOR = 'rgba(255, 255, 255, 0.7)'
// The country group tint over the satellite imagery (the region globe and the
// globe screen's Regions setting), stronger for the region under the
// pointer and the one selected.
const GROUP_OPACITY = 0.45
const GROUP_HOVERED_OPACITY = 0.65
const GROUP_SELECTED_OPACITY = 0.8

// NASA Blue Marble satellite imagery, cut into tiles by
// scripts/make-background-tiles.sh.
const SATELLITE_TILES = '/tiles/satellite/{z}/{x}/{y}.webp'

// The 21600px source image has no extra detail past this zoom level, so
// MapLibre enlarges these tiles instead when zooming further in.
const SATELLITE_MAX_DETAIL_ZOOM = 6

// Population drawn as points of light (the globe screen's Population
// setting), cut into tiles by scripts/make-population-lights.py. Oceans and
// empty land have no tile files, as there is nothing to draw there.
const POPULATION_TILES = '/tiles/population/{z}/{x}/{y}.webp'
// As far as the globe zooms in (MAX_ZOOM_AT_EQUATOR in zoomLimits.ts).
const POPULATION_MAX_DETAIL_ZOOM = 7
// The imagery and the ocean beyond it are dimmed so the lights stand out.
const POPULATION_SATELLITE_BRIGHTNESS = 0.45
const POPULATION_OCEAN_COLOR = '#030810'
// MapLibre's default, undimmed.
const FULL_SATELLITE_BRIGHTNESS = 1
// Fainter borders, so they don't compete with the lights.
const POPULATION_BORDER_OPACITY = 0.6
const FULL_BORDER_OPACITY = 1

// The IHDI colours (the globe screen's IHDI setting): the lowest value is a
// dark reddish purple, fading through red at IHDI_RED_VALUE, orange midway
// between red and yellow, and yellow at IHDI_YELLOW_VALUE, to green at the
// highest value.
// These are raw IHDIs: the app shows them multiplied by 10, as 4.0 and 7.5.
const IHDI_RED_VALUE = 0.4
const IHDI_YELLOW_VALUE = 0.75
const IHDI_ORANGE_COLOR = '#ff8c1a'
const IHDI_LOWEST_COLOR = '#6b0f4e'
const IHDI_LOW_COLOR = '#e5262b'
const IHDI_MIDDLE_COLOR = '#ffe135'
const IHDI_HIGH_COLOR = '#1fb141'
const IHDI_OPACITY = 0.5

// The map is a globe when zoomed out and blends into a flat map between these
// zoom levels. MapLibre's built-in 'globe' only goes flat at zoom 11-12, which
// is further in than the 1:50m borders have detail for.
const GLOBE_UNTIL_ZOOM = 4
const FLAT_FROM_ZOOM = 5

// The 1:50m borders have no extra detail past about this zoom level, so
// MapLibre stops cutting finer tiles and enlarges these ones instead.
const BORDERS_MAX_DETAIL_ZOOM = 8

// Full-detail borders: MapLibre simplifies them itself for each zoom level.
export const COUNTRY_SHAPES = loadCountryShapes()

// Each group's colour, keyed by group id, saved by
// scripts/make-country-group-colours.mjs.
const GROUP_COLOURS: Record<string, string> = groupColoursJson

// The ends of the IHDI colour scale. Estimated values fall within the real ones
// today, but are included so a future estimate can't fall off the scale.
const IHDI_VALUES = Object.values(countryFacts).flatMap(
  (facts) => facts.ihdi ?? facts.ihdiEstimate ?? [],
)
const LOWEST_IHDI = Math.min(...IHDI_VALUES)
const HIGHEST_IHDI = Math.max(...IHDI_VALUES)

// MapLibre needs GeoJSON. Each feature's id is its index in COUNTRY_SHAPES, so
// a tapped feature can be turned back into its CountryShape. The 195 countries
// carry their group's id and colour as "groupId" and "groupColour", and their
// real or else estimated IHDI as "ihdi" (null if they have neither); other map
// areas have none of these.
const COUNTRY_FEATURES: FeatureCollection = {
  type: 'FeatureCollection',
  features: COUNTRY_SHAPES.map((shape, index) => {
    const facts = shape.isoAlpha3 === null ? undefined : countryFacts[shape.isoAlpha3]
    return {
      type: 'Feature',
      id: index,
      geometry: prepareGeometryForFlatMap(shape.geometry),
      properties:
        facts === undefined
          ? {}
          : {
              groupId: facts.groupId,
              groupColour: GROUP_COLOURS[facts.groupId],
              ihdi: facts.ihdi ?? facts.ihdiEstimate,
            },
    }
  }),
}

// The positions in COUNTRY_SHAPES of each group's countries, by group id.
const GROUP_INDICES = new Map<string, number[]>()
COUNTRY_SHAPES.forEach((shape, index) => {
  const facts = shape.isoAlpha3 === null ? undefined : countryFacts[shape.isoAlpha3]
  if (facts === undefined) return
  GROUP_INDICES.set(facts.groupId, [...(GROUP_INDICES.get(facts.groupId) ?? []), index])
})

// Every group's id, for tinting all of them.
export const ALL_GROUP_IDS = [...GROUP_INDICES.keys()]

// The positions in COUNTRY_SHAPES of the group's countries.
export function countryIndicesInGroup(groupId: string): number[] {
  return GROUP_INDICES.get(groupId) ?? []
}

// The positions in COUNTRY_SHAPES of everything that counts as the country in
// the flashcards: its own shape and its far-off parts (e.g. French Guiana for
// France). The country's own shape comes first.
export function shapeIndicesOfCountry(isoAlpha3: string): number[] {
  const indices: number[] = []
  COUNTRY_SHAPES.forEach((shape, index) => {
    if (shape.isoAlpha3 === isoAlpha3) indices.unshift(index)
    else if (shape.partOf === isoAlpha3) indices.push(index)
  })
  return indices
}

// The outline that frames the shape when the globe flies to it: for a country,
// its whole outline including far-off parts (so France frames the same with
// French Guiana split off, as its picture does); otherwise the shape's own
// outline.
function framedGeometry(countryIndex: number): Geometry {
  const shape = COUNTRY_SHAPES[countryIndex]
  return shape.isoAlpha3 === null
    ? shape.geometry
    : wholeCountryGeometry(COUNTRY_SHAPES, shape.isoAlpha3)
}

// The group id of the country at this position in COUNTRY_SHAPES, or null
// for map areas outside the 195 countries.
export function groupIdOfCountry(countryIndex: number): string | null {
  const isoAlpha3 = COUNTRY_SHAPES[countryIndex].isoAlpha3
  return (isoAlpha3 === null ? undefined : countryFacts[isoAlpha3]?.groupId) ?? null
}

// Positions in COUNTRY_SHAPES of the countries that get a tap buffer.
const VERY_SMALL_INDICES = new Set<number>()
COUNTRY_SHAPES.forEach((shape, index) => {
  const facts = shape.isoAlpha3 === null ? undefined : countryFacts[shape.isoAlpha3]
  if (facts !== undefined && facts.areaKm2 < VERY_SMALL_AREA_KM2) VERY_SMALL_INDICES.add(index)
})

const MAP_STYLE: StyleSpecification = {
  version: 8,
  projection: {
    type: [
      'interpolate',
      ['linear'],
      ['zoom'],
      GLOBE_UNTIL_ZOOM,
      'vertical-perspective',
      FLAT_FROM_ZOOM,
      'mercator',
    ],
  },
  sources: {
    countries: {
      type: 'geojson',
      data: COUNTRY_FEATURES,
      maxzoom: BORDERS_MAX_DETAIL_ZOOM,
    },
    satellite: {
      type: 'raster',
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: SATELLITE_MAX_DETAIL_ZOOM,
    },
    population: {
      type: 'raster',
      tiles: [POPULATION_TILES],
      tileSize: 256,
      maxzoom: POPULATION_MAX_DETAIL_ZOOM,
    },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': OCEAN_COLOR } },
    { id: 'satellite-imagery', type: 'raster', source: 'satellite' },
    {
      // Hidden until setIhdiShown shows it. Above the group tint (added under
      // this layer by styleWithGroups) and under the lights and highlights.
      id: 'country-ihdi',
      type: 'fill',
      source: 'countries',
      layout: { visibility: 'none' },
      filter: ['!=', ['get', 'ihdi'], null],
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'ihdi'],
          LOWEST_IHDI,
          IHDI_LOWEST_COLOR,
          IHDI_RED_VALUE,
          IHDI_LOW_COLOR,
          (IHDI_RED_VALUE + IHDI_YELLOW_VALUE) / 2,
          IHDI_ORANGE_COLOR,
          IHDI_YELLOW_VALUE,
          IHDI_MIDDLE_COLOR,
          HIGHEST_IHDI,
          IHDI_HIGH_COLOR,
        ],
        'fill-opacity': IHDI_OPACITY,
      },
    },
    {
      // Hidden (so no tiles load) until setPopulationShown shows it.
      id: 'population-lights',
      type: 'raster',
      source: 'population',
      layout: { visibility: 'none' },
      paint: { 'raster-fade-duration': 0 },
    },
    {
      // Invisible unless hovered or selected, so the imagery shows through.
      // It is still used to find which country was tapped.
      id: 'country-fills',
      type: 'fill',
      source: 'countries',
      paint: {
        // Highlighting uses MapLibre's "feature state", which recolours a
        // country without rebuilding any map data.
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'correct'], false],
          CORRECT_COLOR,
          ['boolean', ['feature-state', 'wrong'], false],
          WRONG_COLOR,
          ['boolean', ['feature-state', 'selected'], false],
          SELECTED_COLOR,
          HOVERED_COLOR,
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'correct'], false],
          ANSWER_OPACITY,
          ['boolean', ['feature-state', 'wrong'], false],
          // "wrongFadeIn" (0 to 1) lets the red fade in; MapLibre doesn't
          // animate feature-state changes itself.
          ['*', ANSWER_OPACITY, ['coalesce', ['feature-state', 'wrongFadeIn'], 1]],
          ['boolean', ['feature-state', 'selected'], false],
          SELECTED_OPACITY,
          ['boolean', ['feature-state', 'hovered'], false],
          HOVERED_OPACITY,
          0,
        ],
      },
    },
    {
      id: 'country-borders',
      type: 'line',
      source: 'countries',
      paint: { 'line-color': BORDER_COLOR, 'line-width': 0.8 },
    },
  ],
}

// The style with countries tinted by their group's colour, between the
// imagery and the highlights: only the groups in `tintedGroupIds`. The feature
// states "groupHovered" and "groupSelected" (set on all of a group's countries
// by setGroupFeatureState) strengthen it.
// The tint can start hidden and be shown later with setGroupTintShown.
function styleWithGroups(tintedGroupIds: string[], isTintShown: boolean): StyleSpecification {
  const groupsLayer: LayerSpecification = {
    id: 'country-groups',
    type: 'fill',
    source: 'countries',
    layout: { visibility: isTintShown ? 'visible' : 'none' },
    filter: ['in', ['get', 'groupId'], ['literal', tintedGroupIds]],
    paint: {
      'fill-color': ['get', 'groupColour'],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'groupSelected'], false],
        GROUP_SELECTED_OPACITY,
        ['boolean', ['feature-state', 'groupHovered'], false],
        GROUP_HOVERED_OPACITY,
        GROUP_OPACITY,
      ],
    },
  }
  return {
    ...MAP_STYLE,
    layers: MAP_STYLE.layers.flatMap((layer) =>
      layer.id === 'satellite-imagery' ? [layer, groupsLayer] : [layer],
    ),
  }
}

// Shows or hides the group tint of a map created with tintedGroupIds.
export function setGroupTintShown(map: MapLibreMap, shown: boolean) {
  map.setLayoutProperty('country-groups', 'visibility', shown ? 'visible' : 'none')
}

// Shows or hides the fills coloured by each country's IHDI.
export function setIhdiShown(map: MapLibreMap, shown: boolean) {
  map.setLayoutProperty('country-ihdi', 'visibility', shown ? 'visible' : 'none')
}

// Shows the population lights and dims the imagery and borders around them, or
// undoes all of it.
export function setPopulationShown(map: MapLibreMap, shown: boolean) {
  map.setLayoutProperty('population-lights', 'visibility', shown ? 'visible' : 'none')
  map.setPaintProperty(
    'satellite-imagery',
    'raster-brightness-max',
    shown ? POPULATION_SATELLITE_BRIGHTNESS : FULL_SATELLITE_BRIGHTNESS,
  )
  map.setPaintProperty('ocean', 'background-color', shown ? POPULATION_OCEAN_COLOR : OCEAN_COLOR)
  map.setPaintProperty(
    'country-borders',
    'line-opacity',
    shown ? POPULATION_BORDER_OPACITY : FULL_BORDER_OPACITY,
  )
}

// Hides the white country borders (Name every country), so neighbouring
// highlights join seamlessly. Call once the map has loaded.
export function hideBorders(map: MapLibreMap) {
  map.setLayoutProperty('country-borders', 'visibility', 'none')
  // Antialiasing softens each fill's edge, so where two see-through
  // highlights meet, their soft edges overlap into a brighter line. Without
  // it they meet exactly, at the cost of slightly jagged coastlines.
  map.setPaintProperty('country-fills', 'fill-antialias', false)
}

// Sets a feature state (e.g. { groupHovered: true }) on every country of the
// group, so the whole region is highlighted together.
export function setGroupFeatureState(
  map: MapLibreMap,
  groupId: string,
  state: Record<string, boolean>,
) {
  for (const index of GROUP_INDICES.get(groupId) ?? []) {
    map.setFeatureState({ source: 'countries', id: index }, state)
  }
}

// Turns and zooms the globe to fit the main landmasses of the group's
// countries in the space between topPadding and bottomPadding (pixels), with
// sidePadding at the left and right. It goes no closer than a country of the
// same width would (focusZoom.ts), so small regions don't fill the screen:
// large regions are limited by the fit, and smaller ones by that curve.
export function flyToGroup(
  map: MapLibreMap,
  groupId: string,
  topPadding: number,
  bottomPadding: number,
  sidePadding: number,
  durationMs: number,
) {
  const shapes = countryIndicesInGroup(groupId).map((index) => ({
    isoAlpha3: COUNTRY_SHAPES[index].isoAlpha3,
    geometry: framedGeometry(index),
  }))
  map.fitBounds(regionBounds(shapes), {
    padding: { top: topPadding, bottom: bottomPadding, left: sidePadding, right: sidePadding },
    maxZoom: focusZoomFor(
      null,
      regionWidthKm(shapes),
      map.getContainer().clientWidth >= WIDE_SCREEN_MIN_PX,
      regionCentre(shapes)[1],
    ),
    duration: durationMs,
  })
}

// Returns the position in COUNTRY_SHAPES of the country a tap at `point` (screen
// pixels) picked, or null for the ocean. Shapes within the tap buffer
// (tapBufferPxFor) can count as tapped (see tapBuffer.ts for which one wins).
export function findTappedCountryIndex(map: MapLibreMap, point: PointLike): number | null {
  const [exact] = map.queryRenderedFeatures(point, { layers: ['country-fills'] })
  const tap = Point.convert(point)
  const bufferPx = tapBufferPxFor(map.getContainer().clientWidth)
  const nearby = map.queryRenderedFeatures(
    [
      [tap.x - bufferPx, tap.y - bufferPx],
      [tap.x + bufferPx, tap.y + bufferPx],
    ],
    { layers: ['country-fills'] },
  )

  // A shape can come back as several features, one per map tile it crosses,
  // each holding only that tile's part of the outline, so all are measured.
  function distanceToPx(index: number): number {
    let nearestPx = Infinity
    for (const feature of nearby) {
      if (Number(feature.id) !== index) continue
      const { geometry } = feature
      const polygons =
        geometry.type === 'Polygon'
          ? [geometry.coordinates]
          : geometry.type === 'MultiPolygon'
            ? geometry.coordinates
            : []
      const screenRings = polygons
        .flat()
        .map((ring) => ring.map((position) => toScreen(map, position)))
      nearestPx = Math.min(nearestPx, distanceToOutlinePx(tap, screenRings))
    }
    return nearestPx
  }

  return chooseTappedIndex(
    exact === undefined ? null : Number(exact.id),
    nearby.map((feature) => Number(feature.id)),
    VERY_SMALL_INDICES,
    bufferPx,
    distanceToPx,
  )
}

// Screen pixel position of a [longitude, latitude] position.
function toScreen(map: MapLibreMap, [longitude, latitude]: Position): ScreenPoint {
  const { x, y } = map.project([longitude, latitude])
  return { x, y }
}

// Turns the globe to centre the country's main landmass in the space between
// topPadding and bottomPadding (pixels), and zooms to a level set by the
// country's width and the screen width (focusZoom.ts). Used both when a
// country is tapped on the globe screen and after a flashcard location answer.
export function flyToCountry(
  map: MapLibreMap,
  countryIndex: number,
  topPadding: number,
  bottomPadding: number,
  durationMs: number,
) {
  const shape = COUNTRY_SHAPES[countryIndex]
  const geometry = framedGeometry(countryIndex)
  const centre = mainLandmassCentre(geometry, shape.isoAlpha3)
  map.flyTo({
    center: centre,
    zoom: focusZoomFor(
      shape.isoAlpha3,
      mainLandmassWidthKm(geometry, shape.isoAlpha3),
      map.getContainer().clientWidth >= WIDE_SCREEN_MIN_PX,
      centre[1],
    ),
    // Moves the country from the middle of the screen to the middle of the
    // space between the top padding and the bottom padding.
    offset: [0, (topPadding - bottomPadding) / 2],
    duration: durationMs,
  })
}

// For each map with hover highlighting, a function that stops it (clearing
// the highlight) or lets it come back. See stopHoverHighlight.
const hoverStoppers = new WeakMap<MapLibreMap, (stopped: boolean) => void>()

// Removes the hover highlight from the map and stops it appearing again.
export function stopHoverHighlight(map: MapLibreMap) {
  hoverStoppers.get(map)?.(true)
}

// Lets the hover highlight appear again after stopHoverHighlight.
export function resumeHoverHighlight(map: MapLibreMap) {
  hoverStoppers.get(map)?.(false)
}

// Creates the country map (globe zoomed out, flat map zoomed in) inside the
// container, with hover highlighting on devices that can hover. The groups in
// `tintedGroupIds` are tinted in their colours (the region globe, and the
// globe screen, which starts with the tint hidden by `isTintShown`). The caller
// handles clicks and must call map.remove() when done.
export function createCountryMap(
  container: HTMLElement,
  tintedGroupIds?: string[],
  isTintShown = true,
): MapLibreMap {
  const map = new MapLibreMap({
    container,
    style: tintedGroupIds !== undefined ? styleWithGroups(tintedGroupIds, isTintShown) : MAP_STYLE,
    center: [0, 20],
    zoom: 1.5,
    pixelRatio: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    attributionControl: false,
  })

  // The zoom limits depend on the latitude at the centre of the map, so they
  // are updated whenever the map moves. MapLibre then keeps the zoom inside them.
  function updateZoomLimits() {
    const { minZoom, maxZoom } = zoomLimitsFor(map.getCenter().lat, container.clientWidth)
    map.setMinZoom(minZoom)
    map.setMaxZoom(maxZoom)
  }
  updateZoomLimits()
  map.on('move', updateZoomLimits)

  // MapLibre only logs errors itself when nothing listens for them, so this
  // has to log the others. Population tiles fail wherever there is nothing to
  // draw (no file is written for those), which is expected and draws nothing.
  map.on('error', (event) => {
    const { sourceId } = event as { sourceId?: string }
    if (sourceId !== 'population') console.error(event.error)
  })

  if (CAN_HOVER) {
    // Kept outside React state: hover changes often and only affects the map.
    let hoveredIndex: number | null = null
    let isHoverStopped = false

    function setHovered(index: number | null) {
      if (hoveredIndex !== null) {
        map.setFeatureState({ source: 'countries', id: hoveredIndex }, { hovered: false })
      }
      if (index !== null) {
        map.setFeatureState({ source: 'countries', id: index }, { hovered: true })
      }
      hoveredIndex = index
      map.getCanvas().style.cursor = index === null ? '' : 'pointer'
    }

    // Uses the same lookup as a click, so the pointer cursor and highlight also
    // show within the tap buffer.
    map.on('mousemove', (event) => {
      if (isHoverStopped) return
      const index = findTappedCountryIndex(map, event.point)
      if (index !== hoveredIndex) setHovered(index)
    })
    map.on('mouseout', () => setHovered(null))
    hoverStoppers.set(map, (stopped) => {
      isHoverStopped = stopped
      if (stopped) setHovered(null)
    })
  }

  return map
}
