import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { countryFacts } from '../../shared/countryFacts'
import { shuffled } from '../../shared/shuffled'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import { moveItem, orderingTitle, swapItems, type OrderingStat } from './orderingQuestion'
import './Flashcard.css'
import './OrderingCard.css'

// A press that moves further than this (in pixels) before release is a drag,
// not a tap.
const DRAG_PX = 8

// How long the tiles take to slide into the right order on Reveal.
const REVEAL_SLIDE_MS = 600

// The stat's name in the question.
const STAT_NAMES: Record<OrderingStat, string> = {
  population: 'population',
  area: 'area',
  ihdi: 'IHDI',
}

type OrderingCardProps = {
  stat: OrderingStat
  // The ISO alpha-3 codes of the countries to order, highest first, from orderingCountries.
  codes: string[]
  onFinish: () => void
}

// The tile being dragged: where the press started and how far it has moved.
type Drag = {
  code: string
  startY: number
  dy: number
  isDragging: boolean
}

// 'ordering' while the user orders the tiles, 'sliding' while they move into
// the right order after Reveal, then 'revealed'.
type Phase = 'ordering' | 'sliding' | 'revealed'

// One ordering question: the countries as tiles in a column, in a random
// order, beside an arrow pointing up from "Lowest" to "Highest". A tile is moved by dragging it to
// another place (the tiles between move along), or by tapping it then
// another tile to swap them. Reveal can be pressed at any time: the tiles
// slide into the right order, then each turns green if the user had it in
// that place or red if not, and shows its range title. It has no FSRS progress.
export function OrderingCard({ stat, codes, onFinish }: OrderingCardProps) {
  // Chosen once, when the card is first shown.
  const [order, setOrder] = useState(() => shuffled(codes))
  // The tile tapped, waiting for another tile to be tapped, or null.
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [phase, setPhase] = useState<Phase>('ordering')
  // The user's order when Reveal was pressed.
  const [answeredOrder, setAnsweredOrder] = useState<string[]>([])
  // Each tile's element, by country code, to measure and slide it.
  const tileElements = useRef(new Map<string, HTMLElement>())
  // Each tile's top edge just before Reveal, by country code.
  const topsBeforeReveal = useRef(new Map<string, number>())
  // Set when a drag ends, so the click the browser fires after it isn't
  // also taken as a tap.
  const justDraggedRef = useRef(false)

  // A click anywhere presses Next while it is showing.
  useClickAnywhereToContinue(phase === 'revealed', onFinish)

  // Once the tiles are in the right order, each is first moved back to where
  // it was, then slides from there to its new place.
  useLayoutEffect(() => {
    if (phase !== 'sliding') return
    for (const [code, element] of tileElements.current) {
      const distance = topsBeforeReveal.current.get(code)! - element.getBoundingClientRect().top
      element.style.transition = 'none'
      element.style.transform = `translateY(${distance}px)`
      // Reading the position makes the browser apply the move back now, so
      // the transition below starts from there.
      element.getBoundingClientRect()
      element.style.transition = `transform ${REVEAL_SLIDE_MS}ms ease`
      element.style.transform = ''
    }
    const timeout = setTimeout(() => setPhase('revealed'), REVEAL_SLIDE_MS)
    return () => clearTimeout(timeout)
  }, [phase])

  function reveal() {
    for (const [code, element] of tileElements.current) {
      topsBeforeReveal.current.set(code, element.getBoundingClientRect().top)
    }
    setAnsweredOrder(order)
    setOrder(codes)
    setSelected(null)
    // Already in the right order, no tile moves, so there is nothing to wait for.
    const isAllCorrect = order.every((code, index) => code === codes[index])
    setPhase(isAllCorrect ? 'revealed' : 'sliding')
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, code: string) {
    if (phase !== 'ordering') return
    // Keeps the pointer's events coming to this tile while it is dragged.
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ code, startY: event.clientY, dy: 0, isDragging: false })
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag === null) return
    const dy = event.clientY - drag.startY
    setDrag({ ...drag, dy, isDragging: drag.isDragging || Math.abs(dy) > DRAG_PX })
  }

  // The tile goes in the place where it is let go: after every other tile
  // whose middle is above the pointer.
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag === null) return
    if (drag.isDragging) {
      justDraggedRef.current = true
      const others = order.filter((code) => code !== drag.code)
      const toIndex = others.filter((code) => {
        const rect = tileElements.current.get(code)!.getBoundingClientRect()
        return rect.top + rect.height / 2 < event.clientY
      }).length
      setOrder(moveItem(order, order.indexOf(drag.code), toIndex))
      setSelected(null)
    }
    setDrag(null)
  }

  function tapTile(code: string) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    if (selected === null || selected === code) {
      setSelected(selected === code ? null : code)
      return
    }
    setOrder(swapItems(order, order.indexOf(selected), order.indexOf(code)))
    setSelected(null)
  }

  function tileClassName(code: string, index: number): string {
    let className = 'ordering__tile'
    if (selected === code) className += ' ordering__tile--selected'
    if (drag?.code === code && drag.isDragging) className += ' ordering__tile--dragged'
    if (phase === 'revealed') {
      const isCorrect = answeredOrder[index] === code
      className += isCorrect ? ' ordering__tile--correct' : ' ordering__tile--wrong'
    }
    return className
  }

  return (
    <article className="flashcard" aria-label="Ordering">
      {/* Centred in the space above the bottom button. */}
      <div className="flashcard__body">
        <p className="flashcard__question">Drag to order these countries by {STAT_NAMES[stat]}</p>
        <div className="ordering__body">
          <ol className="ordering__list">
            {order.map((code, index) => {
              const isDragged = drag?.code === code && drag.isDragging
              const title = orderingTitle(stat, code)!
              return (
                <li key={code}>
                  <button
                    type="button"
                    ref={(element) => {
                      if (element === null) tileElements.current.delete(code)
                      else tileElements.current.set(code, element)
                    }}
                    className={tileClassName(code, index)}
                    style={isDragged ? { transform: `translateY(${drag.dy}px)` } : undefined}
                    disabled={phase !== 'ordering'}
                    aria-pressed={selected === code}
                    onPointerDown={(event) => startDrag(event, code)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={() => setDrag(null)}
                    onClick={() => tapTile(code)}
                  >
                    <span>{countryFacts[code].commonName}</span>
                    {phase === 'revealed' && (
                      <span className="ordering__title">
                        {title.title}
                        {title.isEstimate && ' (estimated)'}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
          {/* To the right of the tiles: an arrow pointing up, from "Lowest" at
            the bottom to "Highest" at the top. */}
          <div className="ordering__scale">
            <span className="ordering__end">Highest</span>
            <div className="ordering__arrow" />
            <span className="ordering__end">Lowest</span>
          </div>
        </div>
      </div>
      {phase === 'revealed' && (
        <button className="flashcard__next arrow-button" onClick={onFinish} autoFocus>
          Next
        </button>
      )}
      {phase === 'ordering' && (
        <button className="flashcard__check ordering__reveal" onClick={reveal}>
          Reveal
        </button>
      )}
    </article>
  )
}
