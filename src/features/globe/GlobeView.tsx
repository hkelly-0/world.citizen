import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BackButton } from '../../shared/BackButton'
import { COUNTRY_SHAPES, createCountryMap } from './countryMap'
import { CountryInfoPanel } from './CountryInfoPanel'
import './GlobeView.css'

// The open info panel has its own browser history entry (on top of the globe
// screen's), so back closes the panel before leaving the globe.
function isPanelOpenInHistory(): boolean {
  return history.state?.panelOpen === true
}

type GlobeViewProps = {
  onBack: () => void
}

export default function GlobeView({ onBack }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // Index into COUNTRY_SHAPES, or null when no country is selected.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Opening the panel adds its history entry; tapping another country while
  // it's open just swaps the country.
  function selectCountry(index: number) {
    if (!isPanelOpenInHistory()) {
      history.pushState({ ...history.state, panelOpen: true }, '')
    }
    setSelectedIndex(index)
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
      const [country] = map.queryRenderedFeatures(event.point, { layers: ['country-fills'] })
      if (country === undefined) closePanel()
      else selectCountry(Number(country.id))
    })

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
    <div className="globe-view">
      <div className="globe-view__canvas" ref={containerRef} />
      <BackButton onClick={goToMenu} />
      {selectedCountry !== null && (
        <CountryInfoPanel country={selectedCountry} onClose={closePanel} />
      )}
    </div>
  )
}
