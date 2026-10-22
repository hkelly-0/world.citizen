import { useEffect, useRef, useState } from 'react'
import { countryDisplayName } from '../../shared/countryFacts'
import {
  COUNTRY_SHAPES,
  createCountryMap,
  findTappedCountryIndex,
  flyToCountry,
  stopHoverHighlight,
} from './countryMap'
import './LocateCountryGlobe.css'

// The globe flies to the correct country, then a Next button appears and the
// globe stays until it is pressed. A wrong answer first shows the tapped
// country's name in red for a moment; the name fades out as the globe starts
// to fly.
const WRONG_NAME_MS = 1200
const FLY_TO_ANSWER_MS = 1500
// Must match the opacity transition in LocateCountryGlobe.css.
const FADE_MS = 600
// The red highlight and the red name fade in together. Must match the
// fade-in animation in LocateCountryGlobe.css.
const WRONG_FADE_IN_MS = 400
// The correct country is centred in the space below the "Select ..." label.
// In pixels.
const LABEL_SPACE_PX = 112
const BOTTOM_PADDING_PX = 24

type LocateCountryGlobeProps = {
  // The country the user has to find, e.g. "FIN".
  isoAlpha3: string
  countryName: string
  // Whether the globe fades away to reveal the card after Next. False when
  // the card has no more questions, so the next card's globe replaces this one
  // without the card flashing up between them.
  fadesOut: boolean
  // Called once the user has pressed Next and the globe has faded away, with
  // whether they tapped the right country.
  onAnswer: (isCorrect: boolean) => void
}

// A full-screen globe asking the user to tap a country. The tapped country
// turns green or red (a wrong answer also shows the right country in green),
// then a Next button fades the globe away.
export default function LocateCountryGlobe({
  isoAlpha3,
  countryName,
  fadesOut,
  onAnswer,
}: LocateCountryGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFading, setIsFading] = useState(false)
  // Whether the globe has finished flying to the correct country, so the Next
  // button is shown.
  const [isNextShown, setIsNextShown] = useState(false)
  // Whether the user tapped the right country; read when Next is pressed.
  const isCorrectRef = useRef(false)
  // The name of the wrongly tapped country, shown in red in the middle of the
  // screen until the globe flies to the correct country.
  const [wrongName, setWrongName] = useState<string | null>(null)
  const [isWrongNameFading, setIsWrongNameFading] = useState(false)
  // The map's click handler is set up once, so it reads these through refs.
  const onAnswerRef = useRef(onAnswer)
  const hasAnsweredRef = useRef(false)
  const timeoutsRef = useRef<number[]>([])
  const fadeInFrameRef = useRef<number | null>(null)

  useEffect(() => {
    onAnswerRef.current = onAnswer
  }, [onAnswer])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const map = createCountryMap(container)
    hasAnsweredRef.current = false

    // Turns the correct country green and flies to it, with the same centre
    // and zoom as tapping a country on the globe screen.
    function flyToCorrectCountry() {
      const correctIndex = COUNTRY_SHAPES.findIndex((shape) => shape.isoAlpha3 === isoAlpha3)
      map.setFeatureState({ source: 'countries', id: correctIndex }, { correct: true })
      flyToCountry(map, correctIndex, LABEL_SPACE_PX, BOTTOM_PADDING_PX, FLY_TO_ANSWER_MS)
    }

    map.on('click', (event) => {
      if (hasAnsweredRef.current) return
      const pickedIndex = findTappedCountryIndex(map, event.point)
      // Tapping the ocean isn't an answer.
      if (pickedIndex === null) return
      hasAnsweredRef.current = true

      // Stops the user interrupting the fly to the correct country, and removes
      // the white hover highlight.
      map.dragPan.disable()
      map.dragRotate.disable()
      map.scrollZoom.disable()
      map.boxZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoomRotate.disable()
      map.touchPitch.disable()
      map.keyboard.disable()
      stopHoverHighlight(map)

      const pickedShape = COUNTRY_SHAPES[pickedIndex]
      const isCorrect = pickedShape.isoAlpha3 === isoAlpha3
      isCorrectRef.current = isCorrect
      const pickedName = countryDisplayName(pickedShape)

      if (isCorrect) {
        flyToCorrectCountry()
      } else {
        // Fades the red highlight in, one animation frame at a time.
        const fadeStart = performance.now()
        const stepFadeIn = (now: number) => {
          const progress = Math.min((now - fadeStart) / WRONG_FADE_IN_MS, 1)
          map.setFeatureState(
            { source: 'countries', id: pickedIndex },
            { wrong: true, wrongFadeIn: progress },
          )
          fadeInFrameRef.current = progress < 1 ? requestAnimationFrame(stepFadeIn) : null
        }
        stepFadeIn(fadeStart)
        setWrongName(pickedName)
        timeoutsRef.current.push(
          window.setTimeout(() => {
            setIsWrongNameFading(true)
            flyToCorrectCountry()
          }, WRONG_NAME_MS),
        )
      }

      const flyStart = isCorrect ? 0 : WRONG_NAME_MS
      timeoutsRef.current.push(
        window.setTimeout(() => setIsNextShown(true), flyStart + FLY_TO_ANSWER_MS),
      )
    })

    return () => {
      timeoutsRef.current.forEach(window.clearTimeout)
      timeoutsRef.current = []
      if (fadeInFrameRef.current !== null) cancelAnimationFrame(fadeInFrameRef.current)
      map.remove()
    }
  }, [isoAlpha3])

  // Fades the globe away to reveal the card (if it fades), then reports the answer.
  function goToNext() {
    if (!fadesOut) {
      onAnswerRef.current(isCorrectRef.current)
      return
    }
    setIsFading(true)
    timeoutsRef.current.push(
      window.setTimeout(() => onAnswerRef.current(isCorrectRef.current), FADE_MS),
    )
  }

  return (
    <div className={isFading ? 'locate-globe locate-globe--fading' : 'locate-globe'}>
      <div className="locate-globe__canvas" ref={containerRef} />
      <p className="locate-globe__label">Select {countryName}</p>
      {wrongName !== null && (
        <p
          className={
            isWrongNameFading
              ? 'locate-globe__wrong-name locate-globe__wrong-name--fading'
              : 'locate-globe__wrong-name'
          }
        >
          {wrongName}
        </p>
      )}
      {isNextShown && (
        <button className="locate-globe__next" onClick={goToNext} autoFocus>
          Next
        </button>
      )}
    </div>
  )
}
