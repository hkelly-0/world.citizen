import { useEffect, useRef, useState } from 'react'
import { countryCodeOfShape } from '../../shared/countries'
import { countryDisplayName, countryFacts } from '../../shared/countryFacts'
import type { AnswerResult } from '../flashcards/fsrs'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import {
  COUNTRY_SHAPES,
  createCountryMap,
  findTappedCountryIndex,
  flyToCountry,
  shapeIndicesOfCountry,
  stopHoverHighlight,
} from './countryMap'
import './LocateCountryGlobe.css'

// The globe flies to the correct country, with a Next button shown straight
// away; the globe stays until it is pressed. A wrong answer first shows the tapped
// country's name in red for a moment; the name fades out as the globe starts
// to fly. The first wrong answer instead shows "one more try" under the name,
// and the globe doesn't fly: the user taps again.
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
  // Called once the user has pressed Next and the globe has faded away: right
  // on the first try, close on the second, otherwise wrong.
  onAnswer: (result: AnswerResult) => void
}

// A full-screen globe asking the user to tap a country, with two tries. A
// wrong first try turns red and stays red while the user tries again. The
// final tapped country turns green or red (a wrong answer also shows the right
// country in green), then a Next button fades the globe away. A country's far-off parts (e.g.
// French Guiana for France) count as the country: tapping one is the same as
// tapping the country, and they turn green or red with it.
export default function LocateCountryGlobe({
  isoAlpha3,
  countryName,
  fadesOut,
  onAnswer,
}: LocateCountryGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFading, setIsFading] = useState(false)
  // Whether a country has been tapped, so the Next button is shown (even while
  // the globe is still flying to the correct country).
  const [isNextShown, setIsNextShown] = useState(false)
  // The answer's result; read when Next is pressed.
  const resultRef = useRef<AnswerResult>('wrong')
  // The name of the wrongly tapped country, shown in red in the middle of the
  // screen until it fades out (as the globe flies to the correct country, or
  // before the second try).
  const [wrongName, setWrongName] = useState<string | null>(null)
  // Whether "one more try" is shown under the wrong name (after the first try).
  const [isOneMoreTry, setIsOneMoreTry] = useState(false)
  // Counts the wrong names shown, so a second one gets a new element and
  // fades in again.
  const [wrongNameCount, setWrongNameCount] = useState(0)
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
    // The shapes of the country wrongly tapped on the first try, or null
    // before then. They stay red during the second try.
    let firstWrongIndices: number[] | null = null

    // Turns the correct country green and flies to it, with the same centre
    // and zoom as tapping a country on the globe screen.
    function flyToCorrectCountry() {
      const correctIndices = shapeIndicesOfCountry(isoAlpha3)
      for (const index of correctIndices) {
        map.setFeatureState({ source: 'countries', id: index }, { correct: true })
      }
      // The first is the country's own shape, not a far-off part.
      flyToCountry(map, correctIndices[0], LABEL_SPACE_PX, BOTTOM_PADDING_PX, FLY_TO_ANSWER_MS)
    }

    map.on('click', (event) => {
      if (hasAnsweredRef.current) return
      const pickedIndex = findTappedCountryIndex(map, event.point)
      // Tapping the ocean isn't an answer.
      if (pickedIndex === null) return
      // Tapping the first try's country again isn't an answer either.
      if (firstWrongIndices !== null && firstWrongIndices.includes(pickedIndex)) return

      const pickedShape = COUNTRY_SHAPES[pickedIndex]
      const pickedCode = countryCodeOfShape(pickedShape)
      const isCorrect = pickedCode === isoAlpha3
      const isFirstTry = firstWrongIndices === null
      // A far-off part is named as its country, e.g. "France" for French Guiana.
      const pickedName =
        pickedShape.partOf === null
          ? countryDisplayName(pickedShape)
          : countryFacts[pickedShape.partOf].commonName
      const pickedIndices = pickedCode === null ? [pickedIndex] : shapeIndicesOfCountry(pickedCode)

      // A wrong first try: the country turns red and its name shows with "One
      // more try", then fades out. The globe stays where it is, and the user
      // can tap again straight away.
      if (!isCorrect && isFirstTry) {
        firstWrongIndices = pickedIndices
        showWrongCountry(pickedIndices, pickedName, true)
        timeoutsRef.current.push(window.setTimeout(() => setIsWrongNameFading(true), WRONG_NAME_MS))
        return
      }

      hasAnsweredRef.current = true
      if (isCorrect) resultRef.current = isFirstTry ? 'right' : 'close'
      else resultRef.current = 'wrong'

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

      if (isCorrect) {
        // Hides the first try's name if it is still showing.
        setIsWrongNameFading(true)
        flyToCorrectCountry()
      } else {
        showWrongCountry(pickedIndices, pickedName, false)
        timeoutsRef.current.push(
          window.setTimeout(() => {
            setIsWrongNameFading(true)
            flyToCorrectCountry()
          }, WRONG_NAME_MS),
        )
      }

      setIsNextShown(true)
    })

    // Fades the wrongly tapped country's red highlight in, one animation frame
    // at a time, and shows its name in red.
    function showWrongCountry(pickedIndices: number[], pickedName: string, isOneMoreTry: boolean) {
      // Ends the first try's name and fade-in, if a second try comes quickly.
      timeoutsRef.current.forEach(window.clearTimeout)
      timeoutsRef.current = []
      if (fadeInFrameRef.current !== null) {
        cancelAnimationFrame(fadeInFrameRef.current)
        for (const index of firstWrongIndices ?? []) {
          map.setFeatureState({ source: 'countries', id: index }, { wrongFadeIn: 1 })
        }
      }

      const fadeStart = performance.now()
      const stepFadeIn = (now: number) => {
        const progress = Math.min((now - fadeStart) / WRONG_FADE_IN_MS, 1)
        for (const index of pickedIndices) {
          map.setFeatureState(
            { source: 'countries', id: index },
            { wrong: true, wrongFadeIn: progress },
          )
        }
        fadeInFrameRef.current = progress < 1 ? requestAnimationFrame(stepFadeIn) : null
      }
      stepFadeIn(fadeStart)
      setWrongName(pickedName)
      setIsOneMoreTry(isOneMoreTry)
      setIsWrongNameFading(false)
      setWrongNameCount((count) => count + 1)
    }

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
      onAnswerRef.current(resultRef.current)
      return
    }
    setIsFading(true)
    timeoutsRef.current.push(
      window.setTimeout(() => onAnswerRef.current(resultRef.current), FADE_MS),
    )
  }

  // A click anywhere presses Next once it is showing (not again while fading).
  useClickAnywhereToContinue(isNextShown && !isFading, goToNext)

  return (
    <div className={isFading ? 'locate-globe locate-globe--fading' : 'locate-globe'}>
      <div className="locate-globe__canvas" ref={containerRef} />
      <p className="locate-globe__label">Select {countryName}</p>
      {wrongName !== null && (
        <div
          key={wrongNameCount}
          className={
            isWrongNameFading
              ? 'locate-globe__wrong-name locate-globe__wrong-name--fading'
              : 'locate-globe__wrong-name'
          }
        >
          <p className="locate-globe__wrong-country">{wrongName}</p>
          {isOneMoreTry && <p className="locate-globe__one-more-try">one more try</p>}
        </div>
      )}
      {isNextShown && (
        <button className="locate-globe__next arrow-button" onClick={goToNext} autoFocus>
          Next
        </button>
      )}
    </div>
  )
}
