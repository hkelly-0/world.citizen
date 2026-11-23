import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { BackButton } from '../../shared/BackButton'
import { countryCodeOfShape } from '../../shared/countries'
import { Popup } from '../../shared/Popup'
import {
  COUNTRY_SHAPES,
  createCountryMap,
  findTappedCountryIndex,
  flyToCountry,
  hideBorders,
  shapeIndicesOfCountry,
  showBordersOnlyOf,
  stopHoverHighlight,
} from '../globe/countryMap'
import { countryFacts } from '../../shared/countryFacts'
import {
  firstLetterOfName,
  formatElapsedTime,
  remainingCountryNames,
  type NamingArea,
} from './namingGame'
import { countryNameMatch } from '../flashcards/countryNameAnswer'
import { saveNamingScore } from './namingScores'
// The text box's styles (.typed-answer__box), shared with the name question.
import '../flashcards/TypedAnswerReveal.css'
import './NameEveryCountry.css'

// How long the globe takes to fly to the country picked by "Zoom to a
// remaining country", as after a flashcard location answer.
const FLY_TO_HINT_MS = 1500
// The picked country is centred in the space between "First Letter: G" (its
// box is 72px from the top, about 40px tall) and the text box. In pixels.
const HINT_PROMPT_SPACE_PX = 112

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
// taps on it do nothing, except after Hint (beside Give up): it shows "Tap a
// country", and tapping one of the area's unnamed countries shows its white
// border, and "First Letter: G" (for example) in place of "Tap a country",
// until it is named. Below "Tap a country", "Or: Zoom to a remaining country"
// gives the same hint for a random unnamed, unhinted country and flies the
// globe to it; it isn't shown when every unnamed country is already hinted. Each Hint gives one country; pressing it again
// first cancels. The hints given are counted at the end and on the
// scoreboard. Each visit starts again; only the round's score is
// saved, for the menu of areas' scoreboard (namingScores.ts), once the game
// is over or is left midway after Go.
// It starts by asking "Show stopwatch?", then shows "Ready?". Until Go, the
// corner button is Menu rather than Give up. The stopwatch, if shown, runs
// from Go (once the map has loaded) to the end of the game, pausing while
// "Exit?" or "End game?" is open, and its time is shown at the end. Once
// started, Give up and back both ask first, until the game is over. Before
// the start and after the end, back leaves straight away.
export default function NameEveryCountry({ area, onBack }: NameEveryCountryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLFormElement>(null)
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
  // True from Hint until a country is tapped, or Hint is pressed again.
  const [isWaitingForHint, setIsWaitingForHint] = useState(false)
  // ISO alpha-3 codes of the hinted countries not yet named, whose borders
  // show.
  const [hintedCodes, setHintedCodes] = useState<string[]>([])
  // The country of the latest hint, until it is named, whose first letter
  // shows. Null before any hint, and once it is named.
  const [latestHintCode, setLatestHintCode] = useState<string | null>(null)
  // Every hint given this round, including those since named.
  const [hintCount, setHintCount] = useState(0)
  const countryCount = area.countries.length
  // The countries "Zoom to a remaining country" can pick from.
  const unhintedRemainingCodes = area.countries.filter(
    (isoAlpha3) => !namedCodes.includes(isoAlpha3) && !hintedCodes.includes(isoAlpha3),
  )
  const hasWon = namedCodes.length === countryCount
  const isGameOver = hasWon || hasGivenUp
  // The stopwatch's time so far. stopwatchBankedMsRef holds the time from
  // before its latest pause, as each run of the effect below starts afresh.
  const [elapsedMs, setElapsedMs] = useState(0)
  const stopwatchBankedMsRef = useRef(0)
  // The box can only be typed in once the map has loaded, Go is pressed, and
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

  // Saves the round for the scoreboard. Called once the stopwatch has
  // stopped, so its banked time is the final one.
  function saveRound() {
    saveNamingScore({
      areaId: area.id,
      endedAt: Date.now(),
      namedCount: namedCodes.length,
      countryCount,
      elapsedMs: isShowingStopwatch ? stopwatchBankedMsRef.current : null,
      hintCount,
    })
  }

  // Saves the round when the game is won or given up. Runs after the
  // stopwatch effect's cleanup has banked its time.
  useEffect(() => {
    if (isGameOver) saveRound()
    // Only when the game ends; the round's other values don't change after.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver])

  // Leaves for the Extras menu, skipping the exit guard if it is still there.
  // A round left midway ("Exit?" then Yes) is saved first.
  function leave() {
    if (hasStarted && !isGameOver) saveRound()
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
    setIsWaitingForHint(false)
  }

  // Hint starts waiting for a tap, or cancels it. Either way the box keeps
  // focus once a hint is given or cancelled.
  function toggleHint() {
    if (isWaitingForHint) inputRef.current?.focus()
    setIsWaitingForHint(!isWaitingForHint)
  }

  // Shows the country's border and first letter, and stops waiting for a tap.
  function giveHint(isoAlpha3: string) {
    setHintedCodes([...hintedCodes, isoAlpha3])
    setLatestHintCode(isoAlpha3)
    setHintCount(hintCount + 1)
    setIsWaitingForHint(false)
    inputRef.current?.focus()
  }

  // "Or: Zoom to a remaining country": hints a random unnamed, unhinted
  // country and flies the globe to it.
  function zoomToRemainingCountry() {
    const map = mapRef.current
    if (map === null || unhintedRemainingCodes.length === 0) return
    const isoAlpha3 =
      unhintedRemainingCodes[Math.floor(Math.random() * unhintedRemainingCodes.length)]
    // The country's own shape comes first, then its far-off parts.
    const countryIndex = shapeIndicesOfCountry(isoAlpha3)[0]
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    flyToCountry(map, countryIndex, HINT_PROMPT_SPACE_PX, panelHeight, FLY_TO_HINT_MS)
    giveHint(isoAlpha3)
  }

  // While waiting for a hint, a tap on one of the area's unnamed countries
  // (or its far-off parts) shows its border. Taps on the ocean, other
  // countries, or one already named or hinted do nothing, and it keeps
  // waiting.
  useEffect(() => {
    const map = mapRef.current
    if (!isWaitingForHint || map === null) return
    function hintTappedCountry(event: MapMouseEvent) {
      if (map === null) return
      const index = findTappedCountryIndex(map, event.point)
      if (index === null) return
      const isoAlpha3 = countryCodeOfShape(COUNTRY_SHAPES[index])
      if (
        isoAlpha3 === null ||
        !area.countries.includes(isoAlpha3) ||
        namedCodes.includes(isoAlpha3) ||
        hintedCodes.includes(isoAlpha3)
      ) {
        return
      }
      giveHint(isoAlpha3)
    }
    map.on('click', hintTappedCountry)
    return () => {
      map.off('click', hintTappedCountry)
    }
    // giveHint only reads the state listed here.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaitingForHint, area, namedCodes, hintedCodes, hintCount])

  // Shows the borders of the hinted countries not yet named.
  useEffect(() => {
    const map = mapRef.current
    if (isMapLoaded && map !== null) showBordersOnlyOf(map, hintedCodes)
  }, [isMapLoaded, hintedCodes])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const map = createCountryMap(container)
    map.jumpTo({ center: area.centre })
    mapRef.current = map
    // Taps don't do anything in this game (except after Hint), so there is no
    // hover highlight or pointer cursor.
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

    const match = countryNameMatch(typedName)
    if (match === null || !area.countries.includes(match.key)) {
      setIsShaking(true)
      return
    }
    const isoAlpha3 = match.key
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
    // A hinted country's border goes once it is named.
    setHintedCodes(hintedCodes.filter((code) => code !== isoAlpha3))
    if (isoAlpha3 === latestHintCode) setLatestHintCode(null)
    // The name floats up as written in the data, so a typo shows corrected.
    floatText(match.name, false)
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
        <div className="name-every-country__top-left">
          <BackButton label="Give up" onClick={() => setConfirming('end-game')} />
          {/* Styled as the back button beside it. */}
          <button
            className="back-button name-every-country__hint"
            aria-pressed={isWaitingForHint}
            onClick={toggleHint}
          >
            Hint
          </button>
        </div>
      ) : (
        <BackButton onClick={leave} />
      )}
      {/* "Tap a country" (with "Or: Zoom to a remaining country" below it)
          while waiting, else the latest hint's first letter. Gone once the
          game is over, behind its popup. */}
      <div className="name-every-country__hint-area">
        {isWaitingForHint ? (
          <>
            <p className="name-every-country__hint-prompt">Tap a country</p>
            {unhintedRemainingCodes.length > 0 && (
              <button
                className="name-every-country__hint-prompt name-every-country__zoom-hint"
                onClick={zoomToRemainingCountry}
              >
                Or: Zoom to a remaining country
              </button>
            )}
          </>
        ) : (
          latestHintCode !== null &&
          !isGameOver && (
            <p className="name-every-country__hint-prompt">
              First Letter: {firstLetterOfName(countryFacts[latestHintCode].commonName)}
            </p>
          )
        )}
      </div>
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
        <form className="name-every-country__panel" onSubmit={submitName} ref={panelRef}>
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
          <HintCount hintCount={hintCount} />
        </Popup>
      )}
      {hasGivenUp && (
        <Popup
          title={`Score: ${namedCodes.length}/${countryCount}`}
          isScoreTitle
          buttons={[{ label: 'Done', onClick: leave }]}
        >
          {isShowingStopwatch && <ElapsedTime elapsedMs={elapsedMs} />}
          <HintCount hintCount={hintCount} />
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

// The hints given, under the time (if shown) on "You win" or the score after
// Give up.
function HintCount({ hintCount }: { hintCount: number }) {
  return <p className="name-every-country__hint-count">Hints: {hintCount}</p>
}
