import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import { isCountryNameCorrect } from '../flashcards/countryNameAnswer'
import { TYPING_MS_PER_LETTER, TypedAnswerReveal } from '../flashcards/TypedAnswerReveal'
import { COUNTRY_SHAPES, createCountryMap, flyToCountry, stopHoverHighlight } from './countryMap'
import './NameCountryGlobe.css'

// Must match the opacity transition in NameCountryGlobe.css.
const FADE_MS = 600
// The country is centred in the space between the back button and the
// "This is" panel. In pixels.
const BACK_BUTTON_SPACE_PX = 64

type NameCountryGlobeProps = {
  // The country the user has to name.
  country: CountryFacts
  // Whether the globe fades away to reveal the card. False when the card has
  // no more questions, so the next card's globe replaces this one without the
  // card flashing up between them.
  fadesOut: boolean
  // Called once the user has pressed Next and the globe has faded away, with
  // whether they typed the right name.
  onAnswer: (isCorrect: boolean) => void
}

// A full-screen globe, opened on one country highlighted in yellow, asking the
// user to type its name. The user can spin and zoom the globe, but taps on it
// do nothing. The typed name turns green or red (with the correct name typed
// out beside a wrong one), then a Next button fades the globe away.
export default function NameCountryGlobe({ country, fadesOut, onAnswer }: NameCountryGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLFormElement>(null)
  const [typedName, setTypedName] = useState('')
  // The user's answer, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  const [isFading, setIsFading] = useState(false)
  // Whether the answer has been revealed in full (a wrong answer's correct name
  // has finished typing out), so the Next button, shown right after Reveal, can
  // be pressed.
  const [isNextEnabled, setIsNextEnabled] = useState(false)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
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

  // A disabled button can't take focus, so Next is focused once it is enabled.
  useEffect(() => {
    if (isNextEnabled) nextButtonRef.current?.focus()
  }, [isNextEnabled])

  function submitName(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    const isCorrect = isCountryNameCorrect(typedName, country)
    setAnswer(typedName)

    // A wrong answer waits for the correct name to finish typing out.
    const typingMs = isCorrect ? 0 : country.commonName.length * TYPING_MS_PER_LETTER
    timeoutsRef.current.push(window.setTimeout(() => setIsNextEnabled(true), typingMs))
  }

  // Fades the globe away to reveal the card (if it fades), then reports the answer.
  function goToNext() {
    const isCorrect = isCountryNameCorrect(answer ?? '', country)
    if (!fadesOut) {
      onAnswer(isCorrect)
      return
    }
    setIsFading(true)
    timeoutsRef.current.push(window.setTimeout(() => onAnswer(isCorrect), FADE_MS))
  }

  // A click anywhere presses Next once it is enabled (not again while fading).
  useClickAnywhereToContinue(isNextEnabled && !isFading, goToNext)

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
        {answer !== null && (
          <button
            type="button"
            className="name-globe__next arrow-button"
            onClick={goToNext}
            disabled={!isNextEnabled}
            ref={nextButtonRef}
          >
            Next
          </button>
        )}
      </form>
    </div>
  )
}
