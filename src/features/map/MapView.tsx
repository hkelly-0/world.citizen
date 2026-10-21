import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre prepares map tiles in a background worker. It looks for the worker
// script next to its own file, which doesn't exist once Vite has bundled the
// app, so Vite copies the script and we tell MapLibre where it is.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection } from 'geojson'
import { loadCountryShapes } from '../../shared/countries'
import { CountryInfoPanel } from '../globe/CountryInfoPanel'
import { prepareGeometryForFlatMap } from './flatMapGeometry'
import './MapView.css'

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
const BORDER_COLOR = 'rgba(255, 255, 255, 0.7)'

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
const MAX_ZOOM = 10

// Full-detail borders: MapLibre simplifies them itself for each zoom level.
const COUNTRY_SHAPES = loadCountryShapes()

// MapLibre needs GeoJSON. Each feature's id is its index in COUNTRY_SHAPES, so
// a tapped feature can be turned back into its CountryShape.
const COUNTRY_FEATURES: FeatureCollection = {
  type: 'FeatureCollection',
  features: COUNTRY_SHAPES.map((shape, index) => ({
    type: 'Feature',
    id: index,
    geometry: prepareGeometryForFlatMap(shape.geometry),
    properties: {},
  })),
}

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
          ['boolean', ['feature-state', 'selected'], false],
          SELECTED_COLOR,
          HOVERED_COLOR,
        ],
        'fill-opacity': [
          'case',
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

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // Index into COUNTRY_SHAPES, or null when no country is selected.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Create the map once, when the component mounts.
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 1.5,
      maxZoom: MAX_ZOOM,
      pixelRatio: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
      attributionControl: false,
    })
    mapRef.current = map

    // Tapping a country selects it; tapping the ocean closes the info panel.
    map.on('click', (event) => {
      const [country] = map.queryRenderedFeatures(event.point, { layers: ['country-fills'] })
      setSelectedIndex(country === undefined ? null : Number(country.id))
    })

    if (CAN_HOVER) {
      // Kept outside React state: hover changes often and only affects the map.
      let hoveredIndex: number | null = null

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

      map.on('mousemove', 'country-fills', (event) => {
        const country = event.features?.[0]
        const index = country === undefined ? null : Number(country.id)
        if (index !== hoveredIndex) setHovered(index)
      })
      map.on('mouseleave', 'country-fills', () => setHovered(null))
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Highlight the selected country, and un-highlight it when the selection changes.
  useEffect(() => {
    if (selectedIndex === null) return
    mapRef.current?.setFeatureState({ source: 'countries', id: selectedIndex }, { selected: true })

    return () => {
      // The map may already be removed if the whole view is unmounting.
      mapRef.current?.setFeatureState(
        { source: 'countries', id: selectedIndex },
        { selected: false },
      )
    }
  }, [selectedIndex])

  const selectedCountry = selectedIndex === null ? null : COUNTRY_SHAPES[selectedIndex]

  return (
    <div className="map-view">
      <div className="map-view__canvas" ref={containerRef} />
      {selectedCountry !== null && (
        <CountryInfoPanel country={selectedCountry} onClose={() => setSelectedIndex(null)} />
      )}
    </div>
  )
}
