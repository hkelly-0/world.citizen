import { useEffect, useRef } from 'react'
import { Marker } from 'maplibre-gl'
import { countryFacts } from '../../shared/countryFacts'
import { borderingCountries } from '../flashcards/bordersQuestion'
import {
  countryLabelPosition,
  createCountryMap,
  flyToCountries,
  shapeIndicesOfCountry,
  stopHoverHighlight,
  thickenBorders,
} from './countryMap'
import './BordersGlobe.css'

// The countries are fitted into the space below the back button and above the
// Next button. In pixels.
const BACK_BUTTON_SPACE_PX = 64
const NEXT_BUTTON_SPACE_PX = 84
const SIDE_PADDING_PX = 24

type BordersGlobeProps = {
  // The borders question's country, e.g. "FRA".
  code: string
  // The bordering countries the user named.
  namedCodes: string[]
  onNext: () => void
}

// A full-screen globe shown after a borders question: the question's country
// in yellow with its borders drawn thicker, the neighbours named in green, and
// those missed in red (wrong guesses are left plain). It opens framed on the
// country and all its neighbours, and can be spun and zoomed; tapping a
// country does nothing (only Next continues, so the user can look around
// freely). A country's far-off parts are coloured with it. Each coloured
// country's name is written over its main landmass (not its far-off parts).
// Names are always all shown, so small neighbours' may overlap until the user
// zooms in.
export default function BordersGlobe({ code, namedCodes, onNext }: BordersGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const borderCodes = borderingCountries(code)
    const missedCodes = borderCodes.filter((border) => !namedCodes.includes(border))
    const map = createCountryMap(container)
    stopHoverHighlight(map)
    // The question's country first, as the fit is measured from it.
    flyToCountries(
      map,
      [code, ...borderCodes],
      BACK_BUTTON_SPACE_PX,
      NEXT_BUTTON_SPACE_PX,
      SIDE_PADDING_PX,
      0,
    )

    function colour(codes: string[], state: Record<string, boolean>) {
      for (const country of codes) {
        for (const index of shapeIndicesOfCountry(country)) {
          map.setFeatureState({ source: 'countries', id: index }, state)
        }
      }
    }
    // Feature states can only be set once the map's data has loaded.
    map.once('load', () => {
      colour([code], { highlighted: true })
      thickenBorders(map, code)
      colour(namedCodes, { correct: true })
      colour(missedCodes, { wrong: true })
    })

    // HTML labels rather than a MapLibre text layer, which would need font
    // files from a server (the app works offline). They are hidden, not
    // faded, while on the far side of the globe.
    for (const country of [code, ...borderCodes]) {
      const label = document.createElement('div')
      label.className = 'borders-globe__label'
      label.textContent = countryFacts[country].commonName
      new Marker({ element: label, opacityWhenCovered: 0 })
        .setLngLat(countryLabelPosition(country))
        .addTo(map)
    }

    return () => map.remove()
    // The globe is shown once per question, so the props are only read when
    // the map is created, by design: a new namedCodes array each render
    // shouldn't rebuild the map.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="borders-globe">
      <div className="borders-globe__canvas" ref={containerRef} />
      <button className="borders-globe__next arrow-button" onClick={onNext} autoFocus>
        Next
      </button>
    </div>
  )
}
