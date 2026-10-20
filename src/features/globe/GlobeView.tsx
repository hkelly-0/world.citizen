import { useEffect, useRef, useState } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import { loadCountryShapes, type CountryShape } from '../../shared/countries'
import { CountryInfoPanel } from './CountryInfoPanel'
import './GlobeView.css'

// Higher pixel ratios look marginally sharper but are slow in Android WebView.
const MAX_PIXEL_RATIO = 2

const COUNTRY_COLOR = 'rgba(255, 255, 255, 0.08)'
const HOVERED_COLOR = 'rgba(255, 255, 255, 0.3)'
const SELECTED_COLOR = 'rgba(255, 200, 60, 0.6)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.6)'

const COUNTRY_ALTITUDE = 0.006
const SELECTED_ALTITUDE = 0.02

export default function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<CountryShape | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<CountryShape | null>(null)

  // Create the globe once, when the component mounts.
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const globe = new Globe(container)
      .globeImageUrl('/textures/earth-blue-marble.jpg')
      .backgroundColor('#000010')
      .width(container.clientWidth)
      .height(container.clientHeight)
      .polygonsData(loadCountryShapes())
      .polygonStrokeColor(() => BORDER_COLOR)
      .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
      .polygonsTransitionDuration(200)
      // globe.gl passes plain objects, but they are the CountryShapes we gave it.
      .onPolygonHover((country) => setHoveredCountry(country as CountryShape | null))
      .onPolygonClick((country) => setSelectedCountry(country as CountryShape))
      // Tapping the ocean closes the info panel.
      .onGlobeClick(() => setSelectedCountry(null))

    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    globeRef.current = globe

    function resizeGlobe() {
      if (container === null) return
      globe.width(container.clientWidth).height(container.clientHeight)
    }
    window.addEventListener('resize', resizeGlobe)

    return () => {
      window.removeEventListener('resize', resizeGlobe)
      globe._destructor()
      container.innerHTML = ''
      globeRef.current = null
    }
  }, [])

  // Re-colour countries whenever the hovered or selected country changes.
  useEffect(() => {
    const globe = globeRef.current
    if (globe === null) return

    globe
      .polygonCapColor((object) => {
        if (object === selectedCountry) return SELECTED_COLOR
        if (object === hoveredCountry) return HOVERED_COLOR
        return COUNTRY_COLOR
      })
      .polygonAltitude((object) =>
        object === selectedCountry ? SELECTED_ALTITUDE : COUNTRY_ALTITUDE,
      )
  }, [hoveredCountry, selectedCountry])

  return (
    <div className="globe-view">
      <div className="globe-view__canvas" ref={containerRef} />
      {selectedCountry !== null && (
        <CountryInfoPanel country={selectedCountry} onClose={() => setSelectedCountry(null)} />
      )}
    </div>
  )
}
