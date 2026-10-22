import { useEffect, useRef, useState } from 'react'
import { geoArea, geoCentroid } from 'd3-geo'
import type { Feature, Polygon } from 'geojson'
import { countryFacts } from '../../shared/countryFacts'
import { COUNTRY_SHAPES, createCountryMap } from './countryMap'
import './LocateCountryGlobe.css'

// How long the coloured answer stays on the globe before it fades. A wrong
// answer waits longer, so the globe can fly to the correct country first.
const PAUSE_AFTER_CORRECT_MS = 1500
const PAUSE_AFTER_WRONG_MS = 2500
// Must match the opacity transition in LocateCountryGlobe.css.
const FADE_MS = 600
const FLY_TO_ANSWER_MS = 1500
// The globe flies out to at most this zoom, so the whole country is in view.
const MAX_FLY_TO_ZOOM = 3

type LocateCountryGlobeProps = {
  // The country the user has to find, e.g. "FIN".
  isoAlpha3: string
  countryName: string
  // Called once the globe has faded away, with the name of the area the user
  // tapped and whether it was the right country.
  onAnswer: (pickedName: string, isCorrect: boolean) => void
}

// The centre of the country's largest part, as [longitude, latitude].
function mainLandmassCentre(index: number): [number, number] {
  const geometry = COUNTRY_SHAPES[index].geometry
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    throw new Error(`Unexpected geometry type ${geometry.type}`)
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const parts: Feature<Polygon>[] = polygons.map((coordinates) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates },
  }))
  const largest = parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a))
  return geoCentroid(largest)
}

// A full-screen globe asking the user to tap a country. The tapped country
// turns green or red (a wrong answer also shows the right country in green),
// then the globe fades away.
export default function LocateCountryGlobe({
  isoAlpha3,
  countryName,
  onAnswer,
}: LocateCountryGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFading, setIsFading] = useState(false)
  // The map's click handler is set up once, so it reads these through refs.
  const onAnswerRef = useRef(onAnswer)
  const hasAnsweredRef = useRef(false)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    onAnswerRef.current = onAnswer
  }, [onAnswer])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const map = createCountryMap(container)
    hasAnsweredRef.current = false

    map.on('click', (event) => {
      if (hasAnsweredRef.current) return
      const [picked] = map.queryRenderedFeatures(event.point, { layers: ['country-fills'] })
      // Tapping the ocean isn't an answer.
      if (picked === undefined) return
      hasAnsweredRef.current = true

      const pickedIndex = Number(picked.id)
      const pickedShape = COUNTRY_SHAPES[pickedIndex]
      const isCorrect = pickedShape.isoAlpha3 === isoAlpha3
      const pickedName =
        (pickedShape.isoAlpha3 === null ? undefined : countryFacts[pickedShape.isoAlpha3]?.commonName) ??
        pickedShape.name

      map.setFeatureState(
        { source: 'countries', id: pickedIndex },
        isCorrect ? { correct: true } : { wrong: true },
      )
      if (!isCorrect) {
        const correctIndex = COUNTRY_SHAPES.findIndex((shape) => shape.isoAlpha3 === isoAlpha3)
        map.setFeatureState({ source: 'countries', id: correctIndex }, { correct: true })
        map.flyTo({
          center: mainLandmassCentre(correctIndex),
          zoom: Math.min(map.getZoom(), MAX_FLY_TO_ZOOM),
          duration: FLY_TO_ANSWER_MS,
        })
      }

      const pause = isCorrect ? PAUSE_AFTER_CORRECT_MS : PAUSE_AFTER_WRONG_MS
      timeoutsRef.current.push(
        window.setTimeout(() => setIsFading(true), pause),
        window.setTimeout(() => onAnswerRef.current(pickedName, isCorrect), pause + FADE_MS),
      )
    })

    return () => {
      timeoutsRef.current.forEach(window.clearTimeout)
      timeoutsRef.current = []
      map.remove()
    }
  }, [isoAlpha3])

  return (
    <div className={isFading ? 'locate-globe locate-globe--fading' : 'locate-globe'}>
      <div className="locate-globe__canvas" ref={containerRef} />
      <p className="locate-globe__label">Select {countryName}</p>
    </div>
  )
}
