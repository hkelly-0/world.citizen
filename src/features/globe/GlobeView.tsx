import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BackButton } from '../../shared/BackButton'
import type { QuestionId } from '../flashcards/deck'
import {
  COUNTRY_SHAPES,
  createCountryMap,
  findTappedCountryIndex,
  flyToCountry,
} from './countryMap'
import { CountryInfoPanel } from './CountryInfoPanel'
import { CountrySearch } from './CountrySearch'
import './GlobeView.css'

// The open info panel has its own browser history entry (on top of the globe
// screen's), so back closes the panel before leaving the globe.
function isPanelOpenInHistory(): boolean {
  return history.state?.panelOpen === true
}

// When a country is selected the globe turns to centre its main landmass in
// the space not covered by the back button and info panel, and zooms to a
// level set by the country's width and the screen width (focusZoom.ts). The padding is in pixels.
const FOCUS_PADDING = 24
const FOCUS_TOP_PADDING = 72
const FOCUS_DURATION_MS = 1200
// The panel's bottom margin, plus a gap above it.
const PANEL_BOTTOM_MARGIN = 16

type GlobeViewProps = {
  // The information chosen in Settings, shown on the info panel.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
}

export default function GlobeView({ learnedQuestionIds, onBack }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  // Index into COUNTRY_SHAPES, or null when no country is selected.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // The map's current zoom level, shown for debugging on the dev server only.
  const [zoom, setZoom] = useState<number | null>(null)

  // Opening the panel adds its history entry; tapping another country while
  // it's open just swaps the country.
  function selectCountry(index: number) {
    if (!isPanelOpenInHistory()) {
      history.pushState({ ...history.state, panelOpen: true }, '')
    }
    setSelectedIndex(index)
  }

  // Choosing a country in the search box, or clicking a country's name in a
  // territory's info panel, works like tapping it on the globe.
  function selectCountryByCode(isoAlpha3: string) {
    const index = COUNTRY_SHAPES.findIndex((shape) => shape.isoAlpha3 === isoAlpha3)
    if (index !== -1) selectCountry(index)
  }

  // Going back fires 'popstate', which clears the selection (below).
  function closePanel() {
    if (isPanelOpenInHistory()) history.back()
  }

  // With the panel open, its history entry is skipped too.
  function goToMenu() {
    if (isPanelOpenInHistory()) history.go(-2)
    else onBack()
  }

  // Back (browser or Android) from the panel's entry closes the panel.
  useEffect(() => {
    const closePanelIfLeft = () => {
      if (!isPanelOpenInHistory()) setSelectedIndex(null)
    }
    window.addEventListener('popstate', closePanelIfLeft)
    return () => window.removeEventListener('popstate', closePanelIfLeft)
  }, [])

  // Create the map once, when the component mounts.
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const map = createCountryMap(container)
    mapRef.current = map

    // Tapping a country selects it; tapping the ocean closes the info panel.
    map.on('click', (event) => {
      const index = findTappedCountryIndex(map, event.point)
      if (index === null) closePanel()
      else selectCountry(index)
    })

    if (import.meta.env.DEV) {
      setZoom(map.getZoom())
      map.on('zoom', () => setZoom(map.getZoom()))
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

  // Turn and zoom the globe to the selected country. The panel is already on
  // screen by now, so it can be measured.
  useEffect(() => {
    const map = mapRef.current
    if (selectedIndex === null || map === null) return

    const mapHeight = map.getContainer().clientHeight
    const panel = panelRef.current
    let panelHeight = panel?.offsetHeight ?? 0
    // The flag sits just above the panel, outside it, so add the space it takes.
    const flag = panel?.querySelector('.country-info-panel__flag')
    if (panel && flag) {
      panelHeight += panel.getBoundingClientRect().top - flag.getBoundingClientRect().top
    }
    // On a short screen the panel could leave no room, so it gets at most 40%.
    const bottomPadding = Math.min(
      panelHeight + PANEL_BOTTOM_MARGIN + FOCUS_PADDING,
      mapHeight * 0.4,
    )
    flyToCountry(map, selectedIndex, FOCUS_TOP_PADDING, bottomPadding, FOCUS_DURATION_MS)
  }, [selectedIndex])

  const selectedCountry = selectedIndex === null ? null : COUNTRY_SHAPES[selectedIndex]

  return (
    <div className="globe-view">
      <div className="globe-view__canvas" ref={containerRef} />
      <BackButton onClick={goToMenu} />
      <CountrySearch onSelect={selectCountryByCode} />
      {selectedCountry !== null && (
        <CountryInfoPanel
          country={selectedCountry}
          learnedQuestionIds={learnedQuestionIds}
          onClose={closePanel}
          onSelectCountry={selectCountryByCode}
          ref={panelRef}
        />
      )}
      {zoom !== null && <div className="globe-view__zoom">Zoom {zoom.toFixed(2)}</div>}
    </div>
  )
}
