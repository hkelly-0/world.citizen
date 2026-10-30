import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { BackButton } from '../../shared/BackButton'
import {
  createCountryMap,
  hideBorders,
  shapeIndicesOfCountry,
  stopHoverHighlight,
} from '../globe/countryMap'
import {
  formatElapsedTime,
  namedCountry,
  remainingCountryNames,
  type NamingArea,
} from './namingGame'
// The text box's styles (.typed-answer__box), shared with the name question.
import '../flashcards/TypedAnswerReveal.css'
import './NameEveryCountry.css'

// The game adds a history entry of its own on top of its screen's, so that
// browser or Android back pops it and asks "Exit?" instead of leaving.
function isExitGuardInHistory(): boolean {
  return history.state?.exitGuard === true
}

type NameEveryCountryProps = {
  // The world or the continent whose countries are to be named.
  area: NamingArea
  // Goes back to the Extras menu from the game screen's own history entry.
  onBack: () => void
}

// A popup being shown over the game, asking to confirm: 'exit' for browser or
// Android back, 'end-game' for Give up.
type Confirming = 'exit' | 'end-game' | null

// A game under Extras: every country of the chosen area (the world or one
// continent) starts highlighted in yellow on a full-screen globe, turned
// towards the area, and the user types country names into the box at the
// bottom. A country outside the area counts as a wrong name. A right name unhighlights its country (and its far-off parts, e.g.
// French Guiana for France) and clears the box; a wrong one, or one already
// named, shakes the box and stays, and one already named also floats up
// "Already named". The user can spin and zoom the globe, but
// taps on it do nothing. Nothing is saved: each visit starts again.
// It starts by asking "Show stopwatch?", then shows "Ready?". Until Go, the
// corner button is Menu rather than Give up. The stopwatch, if shown, runs
// from Go (once the map has loaded) to the end of the game, pausing while
// "Exit?" or "End game?" is open, and its time is shown at the end. Once
// started, Give up and back both ask first, until the game is over. Before
// the start and after the end, back leaves straight away.
export default function NameEveryCountry({ area, onBack }: NameEveryCountryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // The highlights can only be changed once the map has loaded, so the box
  // is disabled until then.
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [typedName, setTypedName] = useState('')
  // ISO alpha-3 codes of the countries named so far.
  const [namedCodes, setNamedCodes] = useState<string[]>([])
  const [isShaking, setIsShaking] = useState(false)
  // Each right name, as typed, floats up in green above the box and fades,
  // and is removed when its animation ends. A country named again floats up
  // "Already named" in red instead. Several can float at once, so each gets
  // an id from nextFloatingIdRef.
  const [floatingNames, setFloatingNames] = useState<
    { id: number; text: string; isAlreadyNamed: boolean }[]
  >([])
  const nextFloatingIdRef = useRef(0)
  // Null while "Show stopwatch?" is asked, then the answer.
  const [isShowingStopwatch, setIsShowingStopwatch] = useState<boolean | null>(null)
  // False while "Show stopwatch?" or "Ready?" is shown, until Go is pressed.
  const [hasStarted, setHasStarted] = useState(false)
  const [hasGivenUp, setHasGivenUp] = useState(false)
  const [confirming, setConfirming] = useState<Confirming>(null)
  const countryCount = area.countries.length
  const hasWon = namedCodes.length === countryCount
  const isGameOver = hasWon || hasGivenUp
  // The stopwatch's time so far. stopwatchBankedMsRef holds the time from
  // before its latest pause, as each run of the effect below starts afresh.
  const [elapsedMs, setElapsedMs] = useState(0)
  const stopwatchBankedMsRef = useRef(0)
  // The box can only be typed in once the map has loaded, Go is pressed and
  // no popup is open.
  const isBoxEnabled = isMapLoaded && hasStarted && confirming === null
  const isStopwatchRunning = isShowingStopwatch === true && isBoxEnabled && !isGameOver

  // Updates the stopwatch several times a second while it runs, and banks
  // the time when it pauses or stops.
  useEffect(() => {
    if (!isStopwatchRunning) return
    const runStartedAt = Date.now()
    const interval = setInterval(
      () => setElapsedMs(stopwatchBankedMsRef.current + Date.now() - runStartedAt),
      200,
    )
    return () => {
      clearInterval(interval)
      stopwatchBankedMsRef.current += Date.now() - runStartedAt
      setElapsedMs(stopwatchBankedMsRef.current)
    }
  }, [isStopwatchRunning])

  // Not added again if it is already there, e.g. after reloading the website.
  useEffect(() => {
    if (!isExitGuardInHistory()) {
      history.pushState({ ...history.state, exitGuard: true }, '')
    }
  }, [])

  // Back pops the exit guard, landing on the game screen's own entry. Going
  // further back (leaving) also fires 'popstate', but lands on another
  // screen's entry, so is ignored here.
  useEffect(() => {
    function confirmExitIfGuardLeft() {
      if (history.state?.screen !== 'name-every-country' || isExitGuardInHistory()) return
      if (!hasStarted || isGameOver) onBack()
      else setConfirming('exit')
    }
    window.addEventListener('popstate', confirmExitIfGuardLeft)
    return () => window.removeEventListener('popstate', confirmExitIfGuardLeft)
  }, [hasStarted, isGameOver, onBack])

  // A disabled box loses focus, so it is focused again whenever it becomes
  // enabled: at Go (or when the map loads after it), and after Cancel on
  // "Exit?" or "End game?".
  useEffect(() => {
    if (isBoxEnabled) inputRef.current?.focus()
  }, [isBoxEnabled])

  // Leaves for the Extras menu, skipping the exit guard if it is still there.
  function leave() {
    if (isExitGuardInHistory()) history.go(-2)
    else onBack()
  }

  // Stays in the game after "Exit?", putting back the exit guard that back
  // popped.
  function cancelExit() {
    history.pushState({ ...history.state, exitGuard: true }, '')
    setConfirming(null)
  }

  function endGame() {
    setConfirming(null)
    setHasGivenUp(true)
  }

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const map = createCountryMap(container)
    map.jumpTo({ center: area.centre })
    mapRef.current = map
    // Taps don't do anything in this game, so there is no hover highlight or
    // pointer cursor.
    stopHoverHighlight(map)
    // The country outlines only exist once the map has loaded.
    map.once('load', () => {
      // This game shows no white borders between countries.
      hideBorders(map)
      for (const isoAlpha3 of area.countries) {
        for (const index of shapeIndicesOfCountry(isoAlpha3)) {
          map.setFeatureState({ source: 'countries', id: index }, { selected: true })
        }
      }
      setIsMapLoaded(true)
    })

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [area])

  function submitName(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    // An empty box has no letters to shake.
    if (typedName.trim() === '') return

    const isoAlpha3 = namedCountry(typedName)
    if (isoAlpha3 === null || !area.countries.includes(isoAlpha3)) {
      setIsShaking(true)
      return
    }
    // The box shakes and keeps the name, as for a wrong one, but says why.
    if (namedCodes.includes(isoAlpha3)) {
      setIsShaking(true)
      floatText('Already named', true)
      return
    }
    for (const index of shapeIndicesOfCountry(isoAlpha3)) {
      mapRef.current?.setFeatureState({ source: 'countries', id: index }, { selected: false })
    }
    setNamedCodes([...namedCodes, isoAlpha3])
    floatText(typedName.trim(), false)
    setTypedName('')
  }

  function floatText(text: string, isAlreadyNamed: boolean) {
    setFloatingNames([...floatingNames, { id: nextFloatingIdRef.current, text, isAlreadyNamed }])
    nextFloatingIdRef.current += 1
  }

  return (
    <div
      className={hasStarted ? 'name-every-country' : 'name-every-country name-every-country--ready'}
    >
      <div className="name-every-country__canvas" ref={containerRef} />
      {hasStarted ? (
        <BackButton label="Give up" onClick={() => setConfirming('end-game')} />
      ) : (
        <BackButton onClick={leave} />
      )}
      <div className="name-every-country__corner">
        {isShowingStopwatch === true && (
          <p className="name-every-country__corner-box" aria-label="Stopwatch">
            {formatElapsedTime(elapsedMs)}
          </p>
        )}
        <p className="name-every-country__corner-box">
          {namedCodes.length}/{countryCount}
        </p>
      </div>
      {/* Gone once the game is over, behind "You win" or the remaining
          countries. */}
      {!isGameOver && (
        <form className="name-every-country__panel" onSubmit={submitName}>
          {floatingNames.map((floatingName) => (
            <span
              key={floatingName.id}
              className={
                floatingName.isAlreadyNamed
                  ? 'name-every-country__floating-name name-every-country__floating-name--already-named'
                  : 'name-every-country__floating-name'
              }
              onAnimationEnd={() =>
                setFloatingNames((names) => names.filter((name) => name.id !== floatingName.id))
              }
            >
              {floatingName.text}
            </span>
          ))}
          <input
            className={
              isShaking
                ? 'typed-answer__box name-every-country__box name-every-country__box--shaking'
                : 'typed-answer__box name-every-country__box'
            }
            aria-label="Country name"
            placeholder="Name a country"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            onAnimationEnd={() => setIsShaking(false)}
            ref={inputRef}
            disabled={!isBoxEnabled}
            autoComplete="off"
          />
        </form>
      )}
      {isShowingStopwatch === null && (
        <Popup
          title="Show stopwatch?"
          isConfirmation
          buttons={[
            { label: 'No', onClick: () => setIsShowingStopwatch(false) },
            { label: 'Yes', onClick: () => setIsShowingStopwatch(true) },
          ]}
        />
      )}
      {isShowingStopwatch !== null && !hasStarted && (
        <Popup
          title="Ready?"
          isConfirmation
          buttons={[
            { label: 'Go', onClick: () => setHasStarted(true), colour: 'green', hasArrow: true },
          ]}
        />
      )}
      {confirming === 'exit' && (
        <Popup
          title="Exit?"
          isConfirmation
          buttons={[
            { label: 'Cancel', onClick: cancelExit },
            { label: 'Yes', onClick: leave, colour: 'red' },
          ]}
        />
      )}
      {confirming === 'end-game' && (
        <Popup
          title="End game?"
          isConfirmation
          buttons={[
            { label: 'Cancel', onClick: () => setConfirming(null) },
            { label: 'Yes', onClick: endGame, colour: 'red' },
          ]}
        />
      )}
      {hasWon && (
        <Popup
          title={`${countryCount}/${countryCount}! You win`}
          isScoreTitle
          buttons={[{ label: 'Done', onClick: leave }]}
        >
          {isShowingStopwatch && <ElapsedTime elapsedMs={elapsedMs} />}
        </Popup>
      )}
      {hasGivenUp && (
        <Popup
          title={`Score: ${namedCodes.length}/${countryCount}`}
          isScoreTitle
          buttons={[{ label: 'Done', onClick: leave }]}
        >
          {isShowingStopwatch && <ElapsedTime elapsedMs={elapsedMs} />}
          <h3 className="name-every-country__remaining-heading">Remaining Countries</h3>
          <ul className="name-every-country__remaining">
            {remainingCountryNames(area, namedCodes).map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </Popup>
      )}
    </div>
  )
}

// The stopwatch's final time, under the title of "You win" or the score after
// Give up.
function ElapsedTime({ elapsedMs }: { elapsedMs: number }) {
  return <p className="name-every-country__time">Time: {formatElapsedTime(elapsedMs)}</p>
}

// A card over the dimmed globe, with its buttons side by side along the
// bottom, each optionally tinted red or green or ending in an arrow. The first
// button is focused, so Enter presses it. A confirmation ("Ready?", "Exit?",
// "End game?") centres its title. The score ("You win", or after Give up) has
// a larger green title.
function Popup({
  title,
  isConfirmation = false,
  isScoreTitle = false,
  buttons,
  children,
}: {
  title: string
  isConfirmation?: boolean
  isScoreTitle?: boolean
  buttons: { label: string; onClick: () => void; colour?: 'red' | 'green'; hasArrow?: boolean }[]
  children?: ReactNode
}) {
  return (
    <div className="name-every-country__overlay">
      <div
        className={
          isConfirmation
            ? 'name-every-country__popup name-every-country__popup--confirmation'
            : 'name-every-country__popup'
        }
        role="dialog"
        aria-label={title}
      >
        <h2
          className={
            isScoreTitle
              ? 'name-every-country__popup-title name-every-country__popup-title--score'
              : 'name-every-country__popup-title'
          }
        >
          {title}
        </h2>
        {children}
        <div className="name-every-country__popup-buttons">
          {buttons.map((button, index) => (
            <button
              key={button.label}
              className={[
                'name-every-country__popup-button',
                button.colour === undefined
                  ? ''
                  : `name-every-country__popup-button--${button.colour}`,
                button.hasArrow ? 'arrow-button' : '',
              ]
                .filter((name) => name !== '')
                .join(' ')}
              onClick={button.onClick}
              autoFocus={index === 0}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
