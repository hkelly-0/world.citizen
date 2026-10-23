import {
  Map as MapLibreMap,
  Point,
  setWorkerUrl,
  type PointLike,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre prepares map tiles in a background worker. It looks for the worker
// script next to its own file, which doesn't exist once Vite has bundled the
// app, so Vite copies the script and we tell MapLibre where it is.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection } from 'geojson'
import { loadCountryShapes } from '../../shared/countries'
import { countryFacts } from '../../shared/countryFacts'
import { areCountryGroupsShown, chooseCountryGroupColours } from '../dev/countryGroupColours'
import { prepareGeometryForFlatMap } from './flatMapGeometry'
import { focusZoomFor, WIDE_SCREEN_MIN_PX } from './focusZoom'
import { mainLandmassCentre, mainLandmassWidthKm } from './mainLandmass'
import { chooseTappedIndex, TAP_BUFFER_PX, VERY_SMALL_AREA_KM2 } from './tapBuffer'
import { zoomLimitsFor } from './zoomLimits'

setWorkerUrl(maplibreWorkerUrl)

// True when the main input is a finger (phones and tablets). Their GPUs are
// weaker, so the map uses a lower pixel ratio on them.
const IS_TOUCH_DEVICE = window.matchMedia('(pointer: coarse)').matches

// Phones and tablets can't hover, so hover highlighting is only set up on
// devices with a mouse or trackpad.
const CAN_HOVER = window.matchMedia('(hover: hover)').matches

// Higher pixel ratios look marginally sharper but are slow in Android WebView.
const MAX_PIXEL_RATIO = IS_TOUCH_DEVICE ? 1.5 : 2

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
// The dev option's country group tint, over the satellite imagery.
const GROUP_OPACITY = 0.45

// NASA Blue Marble satellite imagery, cut into tiles by
// scripts/make-background-tiles.sh.
const SATELLITE_TILES = '/tiles/satellite/{z}/{x}/{y}.webp'

// The 21600px source image has no extra detail past this zoom level, so
// MapLibre enlarges these tiles instead when zooming further in.
const SATELLITE_MAX_DETAIL_ZOOM = 6

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

// Each country's group colour for the dev option (see countryGroupColours.ts),
// chosen once per page load. Left empty outside the dev server.
const GROUP_COLOURS: Record<string, string> = import.meta.env.DEV ? chooseCountryGroupColours() : {}

// MapLibre needs GeoJSON. Each feature's id is its index in COUNTRY_SHAPES, so
// a tapped feature can be turned back into its CountryShape. Countries in a
// group carry its colour as "groupColour"; other map areas have none.
const COUNTRY_FEATURES: FeatureCollection = {
  type: 'FeatureCollection',
  features: COUNTRY_SHAPES.map((shape, index) => {
    const groupColour = shape.isoAlpha3 === null ? undefined : GROUP_COLOURS[shape.isoAlpha3]
    return {
      type: 'Feature',
      id: index,
      geometry: prepareGeometryForFlatMap(shape.geometry),
      properties: groupColour === undefined ? {} : { groupColour },
    }
  }),
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
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': OCEAN_COLOR } },
    { id: 'satellite-imagery', type: 'raster', source: 'satellite' },
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

// The same style with each country tinted by its group's colour, between the
// imagery and the highlights. Used while the dev option is on.
const MAP_STYLE_WITH_GROUPS: StyleSpecification = {
  ...MAP_STYLE,
  layers: MAP_STYLE.layers.flatMap((layer) =>
    layer.id === 'satellite-imagery'
      ? [
          layer,
          {
            id: 'country-groups',
            type: 'fill',
            source: 'countries',
            filter: ['has', 'groupColour'],
            paint: { 'fill-color': ['get', 'groupColour'], 'fill-opacity': GROUP_OPACITY },
          },
        ]
      : [layer],
  ),
}

// Returns the position in COUNTRY_SHAPES of the country a tap at `point` (screen
// pixels) picked, or null for the ocean. Very small countries within
// TAP_BUFFER_PX of the tap count as tapped (see tapBuffer.ts).
export function findTappedCountryIndex(map: MapLibreMap, point: PointLike): number | null {
  const [exact] = map.queryRenderedFeatures(point, { layers: ['country-fills'] })
  const { x, y } = Point.convert(point)
  const nearby = map.queryRenderedFeatures(
    [
      [x - TAP_BUFFER_PX, y - TAP_BUFFER_PX],
      [x + TAP_BUFFER_PX, y + TAP_BUFFER_PX],
    ],
    { layers: ['country-fills'] },
  )
  return chooseTappedIndex(
    exact === undefined ? null : Number(exact.id),
    nearby.map((feature) => Number(feature.id)),
    VERY_SMALL_INDICES,
  )
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
  const centre = mainLandmassCentre(shape.geometry, shape.isoAlpha3)
  map.flyTo({
    center: centre,
    zoom: focusZoomFor(
      shape.isoAlpha3,
      mainLandmassWidthKm(shape.geometry, shape.isoAlpha3),
      map.getContainer().clientWidth >= WIDE_SCREEN_MIN_PX,
      centre[1],
    ),
    // Moves the country from the middle of the screen to the middle of the
    // space between the top padding and the bottom padding.
    offset: [0, (topPadding - bottomPadding) / 2],
    duration: durationMs,
  })
}

// For each map with hover highlighting, a function that clears the highlight
// and stops it coming back. See stopHoverHighlight.
const hoverStoppers = new WeakMap<MapLibreMap, () => void>()

// Removes the hover highlight from the map and stops it appearing again.
export function stopHoverHighlight(map: MapLibreMap) {
  hoverStoppers.get(map)?.()
}

// Creates the country map (globe zoomed out, flat map zoomed in) inside the
// container, with hover highlighting on devices that can hover, and the
// country group tint if the dev option is on. The caller
// handles clicks and must call map.remove() when done.
export function createCountryMap(container: HTMLElement): MapLibreMap {
  const map = new MapLibreMap({
    container,
    style: areCountryGroupsShown() ? MAP_STYLE_WITH_GROUPS : MAP_STYLE,
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
    // show within the tap buffer of a very small country.
    map.on('mousemove', (event) => {
      if (isHoverStopped) return
      const index = findTappedCountryIndex(map, event.point)
      if (index !== hoveredIndex) setHovered(index)
    })
    map.on('mouseout', () => setHovered(null))
    hoverStoppers.set(map, () => {
      isHoverStopped = true
      setHovered(null)
    })
  }

  return map
}
