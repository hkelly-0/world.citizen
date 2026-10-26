import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { countryFacts } from '../../shared/countryFacts'
import { flagImageSrc } from '../../shared/flags'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import { placeName, shuffled, type FlagPlacements } from './flagMatchingQuestion'
import './Flashcard.css'
import './FlagMatchingCard.css'

// A press that moves further than this (in pixels) before release is a drag,
// not a tap.
const DRAG_PX = 8

type FlagMatchingCardProps = {
  // The ISO alpha-3 codes of the countries to match, from flagMatchingCountries.
  codes: string[]
  onFinish: () => void
}

// The name being dragged: where the press started and how far it has moved.
type Drag = {
  code: string
  startX: number
  startY: number
  dx: number
  dy: number
  isDragging: boolean
}

// One flag matching question: the flags in a 2 × 2 grid, each with a space
// below it, and the countries' names below them. Each name is put on a flag
// by dragging it there, or by tapping the name then the flag (or its space).
// A name dropped on a flag that already has one swaps with it; dragged
// anywhere else, or tapped then the names' area tapped, it goes back. Reveal
// can be pressed with any number of names placed: it marks each flag green or
// red (red if it has no name), naming the right country under any wrong ones.
// It has no FSRS progress.
export function FlagMatchingCard({ codes, onFinish }: FlagMatchingCardProps) {
  // Both orders are chosen once, when the card is first shown.
  const [flagCodes] = useState(() => shuffled(codes))
  const [nameCodes] = useState(() => shuffled(codes))
  const [placed, setPlaced] = useState<FlagPlacements>(() => codes.map(() => null))
  // The name tapped, waiting for a flag to be tapped, or null.
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  // Set when a drag ends, so the click the browser fires after it isn't
  // also taken as a tap.
  const justDraggedRef = useRef(false)

  const unplacedCodes = nameCodes.filter((code) => !placed.includes(code))

  // A click anywhere presses Next while it is showing.
  useClickAnywhereToContinue(isRevealed, onFinish)

  function moveName(code: string, flagIndex: number | null) {
    setPlaced(placeName(placed, code, flagIndex))
    setSelected(null)
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, code: string) {
    if (isRevealed) return
    // Keeps the pointer's events coming to this name while it is dragged.
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      code,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      isDragging: false,
    })
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag === null) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const isDragging = drag.isDragging || Math.hypot(dx, dy) > DRAG_PX
    setDrag({ ...drag, dx, dy, isDragging })
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag === null) return
    if (drag.isDragging) {
      justDraggedRef.current = true
      moveName(drag.code, flagIndexAt(event.clientX, event.clientY, event.currentTarget))
    }
    setDrag(null)
  }

  function tapName(code: string) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    const flagIndex = placed.indexOf(code)
    // With another name chosen, tapping a name on a flag puts the chosen one there.
    if (selected !== null && selected !== code && flagIndex !== -1) {
      moveName(selected, flagIndex)
      return
    }
    setSelected(selected === code ? null : code)
  }

  function tapFlag(flagIndex: number) {
    if (selected !== null) moveName(selected, flagIndex)
  }

  // Only a tap on the names' area itself, not on a name in it.
  function tapNamesArea(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && selected !== null) moveName(selected, null)
  }

  function nameButton(code: string) {
    const isDragged = drag?.code === code && drag.isDragging
    let className = 'flag-matching__name'
    if (selected === code) className += ' flag-matching__name--selected'
    if (isDragged) className += ' flag-matching__name--dragged'
    return (
      <button
        key={code}
        type="button"
        className={className}
        style={isDragged ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
        disabled={isRevealed}
        aria-pressed={selected === code}
        onPointerDown={(event) => startDrag(event, code)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={() => setDrag(null)}
        onClick={() => tapName(code)}
      >
        {countryFacts[code].commonName}
      </button>
    )
  }

  function slotClassName(flagIndex: number): string {
    if (!isRevealed) return 'flag-matching__slot'
    const isCorrect = placed[flagIndex] === flagCodes[flagIndex]
    return `flag-matching__slot ${isCorrect ? 'flag-matching__slot--correct' : 'flag-matching__slot--wrong'}`
  }

  return (
    <article className="flashcard" aria-label="Flag matching">
      <p className="flashcard__question">Match each name to its flag</p>
      <div className="flag-matching__flags">
        {flagCodes.map((flagCode, flagIndex) => {
          const placedCode = placed[flagIndex]
          return (
            <div key={flagCode} className={slotClassName(flagIndex)} data-flag-index={flagIndex}>
              <button
                type="button"
                className="flag-matching__flag"
                disabled={isRevealed}
                onClick={() => tapFlag(flagIndex)}
                // Labelled only by position before Reveal, so it doesn't give the answer away.
                aria-label={
                  isRevealed
                    ? `Flag of ${countryFacts[flagCode].commonName}`
                    : `Flag ${flagIndex + 1}`
                }
              >
                <img className="flashcard__flag" src={flagImageSrc(flagCode)} alt="" />
              </button>
              {placedCode === null ? (
                // Tapping the empty space works like tapping the flag.
                <div className="flag-matching__space" onClick={() => tapFlag(flagIndex)} />
              ) : (
                nameButton(placedCode)
              )}
              {isRevealed && placedCode !== flagCode && (
                <span className="flag-matching__answer">{countryFacts[flagCode].commonName}</span>
              )}
            </div>
          )
        })}
      </div>
      {!isRevealed && (
        <div className="flag-matching__names" onClick={tapNamesArea}>
          {unplacedCodes.map(nameButton)}
        </div>
      )}
      {isRevealed ? (
        <button className="flashcard__next arrow-button" onClick={onFinish} autoFocus>
          Next
        </button>
      ) : (
        <button
          className="flashcard__check flag-matching__reveal"
          onClick={() => setIsRevealed(true)}
        >
          Reveal
        </button>
      )}
    </article>
  )
}

// The index of the flag (or its space) under the point, or null if the point
// isn't on one. The dragged name is under the point too, so it is skipped:
// otherwise it would find the flag it came from.
function flagIndexAt(x: number, y: number, draggedName: Element): number | null {
  for (const element of document.elementsFromPoint(x, y)) {
    if (draggedName.contains(element)) continue
    const slot = element.closest<HTMLElement>('[data-flag-index]')
    if (slot !== null) return Number(slot.dataset.flagIndex)
  }
  return null
}
