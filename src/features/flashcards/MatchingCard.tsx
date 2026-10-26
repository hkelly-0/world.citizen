import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { countryFacts } from '../../shared/countryFacts'
import { flagImageSrc } from '../../shared/flags'
import { shuffled } from '../../shared/shuffled'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import { capitalsLabel } from './capitalMatchingQuestion'
import { placeLabel, type MatchingPlacements } from './matchingQuestion'
import './Flashcard.css'
import './MatchingCard.css'

// A press that moves further than this (in pixels) before release is a drag,
// not a tap.
const DRAG_PX = 8

// 'flag' is Flag Matching: country names put on flags. 'capital' is Capital
// Matching: capitals put on country names.
export type MatchingKind = 'flag' | 'capital'

const QUESTIONS: Record<MatchingKind, string> = {
  flag: 'Match each country to its flag',
  capital: 'Match each capital to its country',
}

type MatchingCardProps = {
  kind: MatchingKind
  // The ISO alpha-3 codes of the countries to match, from
  // flagMatchingCountries or capitalMatchingCountries.
  codes: string[]
  onFinish: () => void
}

// The label being dragged: where the press started and how far it has moved.
type Drag = {
  code: string
  startX: number
  startY: number
  dx: number
  dy: number
  isDragging: boolean
}

// The text on a country's label: its name on a flag, or its capitals on its name.
function labelText(kind: MatchingKind, code: string): string {
  return kind === 'flag' ? countryFacts[code].commonName : capitalsLabel(code)
}

// One matching question: the targets (flags, or country names) in a 2 × 2
// grid, each with a space below it, and the labels (country names, or
// capitals) below them. Each label is put on a target by dragging it there,
// or by tapping the label then the target (or its space). A label dropped on
// a target that already has one swaps with it; dragged anywhere else, or
// tapped then the labels' area tapped, it goes back. Reveal can be pressed
// with any number of labels placed: it marks each target green or red (red if
// it has no label), giving the right label under any wrong ones. It has no
// FSRS progress.
export function MatchingCard({ kind, codes, onFinish }: MatchingCardProps) {
  // Both orders are chosen once, when the card is first shown.
  const [targetCodes] = useState(() => shuffled(codes))
  const [labelCodes] = useState(() => shuffled(codes))
  const [placed, setPlaced] = useState<MatchingPlacements>(() => codes.map(() => null))
  // The label tapped, waiting for a target to be tapped, or null.
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  // Set when a drag ends, so the click the browser fires after it isn't
  // also taken as a tap.
  const justDraggedRef = useRef(false)

  const unplacedCodes = labelCodes.filter((code) => !placed.includes(code))

  // A click anywhere presses Next while it is showing.
  useClickAnywhereToContinue(isRevealed, onFinish)

  function moveLabel(code: string, targetIndex: number | null) {
    setPlaced(placeLabel(placed, code, targetIndex))
    setSelected(null)
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, code: string) {
    if (isRevealed) return
    // Keeps the pointer's events coming to this label while it is dragged.
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
      moveLabel(drag.code, targetIndexAt(event.clientX, event.clientY, event.currentTarget))
    }
    setDrag(null)
  }

  function tapLabel(code: string) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    const targetIndex = placed.indexOf(code)
    // With another label chosen, tapping a label on a target puts the chosen one there.
    if (selected !== null && selected !== code && targetIndex !== -1) {
      moveLabel(selected, targetIndex)
      return
    }
    setSelected(selected === code ? null : code)
  }

  function tapTarget(targetIndex: number) {
    if (selected !== null) moveLabel(selected, targetIndex)
  }

  // Only a tap on the labels' area itself, not on a label in it.
  function tapLabelsArea(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && selected !== null) moveLabel(selected, null)
  }

  function labelButton(code: string) {
    const isDragged = drag?.code === code && drag.isDragging
    let className = 'matching__label'
    if (selected === code) className += ' matching__label--selected'
    if (isDragged) className += ' matching__label--dragged'
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
        onClick={() => tapLabel(code)}
      >
        {labelText(kind, code)}
      </button>
    )
  }

  // A flag is labelled only by position before Reveal, so it doesn't give the
  // answer away; a country name is already shown.
  function targetLabel(code: string, targetIndex: number): string {
    if (kind === 'capital') return countryFacts[code].commonName
    return isRevealed ? `Flag of ${countryFacts[code].commonName}` : `Flag ${targetIndex + 1}`
  }

  function slotClassName(targetIndex: number): string {
    if (!isRevealed) return 'matching__slot'
    const isCorrect = placed[targetIndex] === targetCodes[targetIndex]
    return `matching__slot ${isCorrect ? 'matching__slot--correct' : 'matching__slot--wrong'}`
  }

  return (
    <article
      className="flashcard"
      aria-label={kind === 'flag' ? 'Flag matching' : 'Capital matching'}
    >
      <p className="flashcard__question">{QUESTIONS[kind]}</p>
      <div className="matching__targets">
        {targetCodes.map((targetCode, targetIndex) => {
          const placedCode = placed[targetIndex]
          return (
            <div
              key={targetCode}
              className={slotClassName(targetIndex)}
              data-target-index={targetIndex}
            >
              <button
                type="button"
                className="matching__target"
                disabled={isRevealed}
                onClick={() => tapTarget(targetIndex)}
                aria-label={targetLabel(targetCode, targetIndex)}
              >
                {kind === 'flag' ? (
                  <img className="flashcard__flag" src={flagImageSrc(targetCode)} alt="" />
                ) : (
                  <span className="matching__country">{countryFacts[targetCode].commonName}</span>
                )}
              </button>
              {placedCode === null ? (
                // Tapping the empty space works like tapping the target.
                <div className="matching__space" onClick={() => tapTarget(targetIndex)} />
              ) : (
                labelButton(placedCode)
              )}
              {isRevealed && placedCode !== targetCode && (
                <span className="matching__answer">{labelText(kind, targetCode)}</span>
              )}
            </div>
          )
        })}
      </div>
      {!isRevealed && (
        <div className="matching__labels" onClick={tapLabelsArea}>
          {unplacedCodes.map(labelButton)}
        </div>
      )}
      {isRevealed ? (
        <button className="flashcard__next arrow-button" onClick={onFinish} autoFocus>
          Next
        </button>
      ) : (
        <button className="flashcard__check matching__reveal" onClick={() => setIsRevealed(true)}>
          Reveal
        </button>
      )}
    </article>
  )
}

// The index of the target (or its space) under the point, or null if the
// point isn't on one. The dragged label is under the point too, so it is
// skipped: otherwise it would find the target it came from.
function targetIndexAt(x: number, y: number, draggedLabel: Element): number | null {
  for (const element of document.elementsFromPoint(x, y)) {
    if (draggedLabel.contains(element)) continue
    const slot = element.closest<HTMLElement>('[data-target-index]')
    if (slot !== null) return Number(slot.dataset.targetIndex)
  }
  return null
}
