import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { isCountryNameCorrect } from '../flashcards/countryNameAnswer'
import { TYPING_MS_PER_LETTER, TypedAnswerReveal } from '../flashcards/TypedAnswerReveal'
import {
  COUNTRY_SHAPES,
  createCountryMap,
  flyToCountry,
  stopHoverHighlight,
} from './countryMap'
import './NameCountryGlobe.css'

// After answering, the revealed answer stays in view for a while (after the
// correct name has finished typing out) before the globe fades.
const HOLD_ON_ANSWER_MS = 1500
// Must match the opacity transition in NameCountryGlobe.css.
const FADE_MS = 600
// The country is centred in the space between the back button and the
// "This is" panel. In pixels.
const BACK_BUTTON_SPACE_PX = 64

type NameCountryGlobeProps = {
  // The country the user has to name.
  country: CountryFacts
  // Called once the globe has faded away, with whether the user typed the
  // right name.
  onAnswer: (isCorrect: boolean) => void
}

// A full-screen globe, opened on one country highlighted in yellow, asking the
// user to type its name. The user can spin and zoom the globe, but taps on it
// do nothing. The typed name turns green or red (with the correct name typed
// out beside a wrong one), then the globe fades away.
export default function NameCountryGlobe({ country, onAnswer }: NameCountryGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLFormElement>(null)
  const [typedName, setTypedName] = useState('')
  // The user's answer, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  const [isFading, setIsFading] = useState(false)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    const container = containerRef.current
    const panel = panelRef.current
    if (container === null || panel === null) return

    const map = createCountryMap(container)
    // Taps don't answer this question, so there is no hover highlight or
    // pointer cursor.
    stopHoverHighlight(map)

    // Opens straight on the country (no flying), with the same centre and zoom
    // as tapping it on the globe screen.
    const countryIndex = COUNTRY_SHAPES.findIndex((shape) => shape.isoAlpha3 === country.isoAlpha3)
    flyToCountry(map, countryIndex, BACK_BUTTON_SPACE_PX, panel.offsetHeight, 0)
    // The country outlines only exist once the map has loaded.
    map.once('load', () => {
      map.setFeatureState({ source: 'countries', id: countryIndex }, { selected: true })
    })

    return () => {
      timeoutsRef.current.forEach(window.clearTimeout)
      timeoutsRef.current = []
      map.remove()
    }
  }, [country.isoAlpha3])

  function submitName(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    const isCorrect = isCountryNameCorrect(typedName, country)
    setAnswer(typedName)

    // A wrong answer waits for the correct name to finish typing out.
    const typingMs = isCorrect ? 0 : country.commonName.length * TYPING_MS_PER_LETTER
    const pause = typingMs + HOLD_ON_ANSWER_MS
    timeoutsRef.current.push(
      window.setTimeout(() => setIsFading(true), pause),
      window.setTimeout(() => onAnswer(isCorrect), pause + FADE_MS),
    )
  }

  return (
    <div className={isFading ? 'name-globe name-globe--fading' : 'name-globe'}>
      <div className="name-globe__canvas" ref={containerRef} />
      <form className="name-globe__panel" onSubmit={submitName} ref={panelRef}>
        <label className="name-globe__label" htmlFor="country-name-answer">
          This is
        </label>
        {answer === null ? (
          <>
            <input
              id="country-name-answer"
              className="typed-answer__box"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              autoComplete="off"
              autoFocus
            />
            <button className="name-globe__reveal">Reveal</button>
          </>
        ) : (
          <TypedAnswerReveal
            typed={answer}
            isCorrect={isCountryNameCorrect(answer, country)}
            correctAnswer={country.commonName}
          />
        )}
      </form>
    </div>
  )
}
