import { Fragment, useEffect, useId, useRef, useState } from 'react'
import type { IhdiBreakdown } from './countryFacts'
import { formatIhdi } from './statRanges'
import './IhdiBreakdownButton.css'

// A small "?" beside an IHDI value (in the globe's info panel, and under the
// IHDI flashcard's answer) that opens a bubble with the IHDI's three
// inequality-adjusted parts, on the same 0–10 scale as the IHDI.
// An estimated IHDI has no breakdown (null), so the bubble says so instead.
// For a country with no IHDI, the info panel passes `noDataNote`, its lines,
// instead (e.g. a rough estimate), which the bubble shows in place of either.
// Tapping the "?" again, or anywhere else in the info panel, closes it. Taps
// outside the panel (e.g. selecting another country on the globe) leave it
// open, so the breakdowns can be compared. On a flashcard there is no panel:
// a tap anywhere else goes on to the next question, which removes it.
export function IhdiBreakdownButton({
  breakdown,
  noDataNote,
}: {
  breakdown: IhdiBreakdown | null
  noDataNote?: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const bubbleId = useId()

  useEffect(() => {
    if (!isOpen) return
    // Capture phase, so no other handler can stop it from arriving.
    function closeOnOutsidePress(event: PointerEvent) {
      const target = event.target as Node
      const panel = wrapperRef.current?.closest('.country-info-panel')
      if (panel?.contains(target) && !wrapperRef.current?.contains(target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress, true)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress, true)
  }, [isOpen])

  return (
    <span ref={wrapperRef} className="ihdi-breakdown">
      <button
        className="ihdi-breakdown__button"
        aria-label={noDataNote === undefined ? 'IHDI breakdown' : 'IHDI note'}
        aria-expanded={isOpen}
        aria-controls={bubbleId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Drawn rather than typed, so the circle can be exactly the height of
            a capital letter and the "?" centred in it. */}
        <svg className="ihdi-breakdown__icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <text
            x="10"
            y="10"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fontWeight="bold"
            fill="currentColor"
          >
            ?
          </text>
        </svg>
      </button>
      {isOpen && (
        <span
          id={bubbleId}
          className={
            noDataNote === undefined
              ? 'ihdi-breakdown__bubble'
              : 'ihdi-breakdown__bubble ihdi-breakdown__bubble--note'
          }
          data-no-continue
        >
          {noDataNote !== undefined ? (
            // A space before each break, so screen readers and tests read the
            // lines as separate words.
            noDataNote.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && ' '}
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))
          ) : breakdown === null ? (
            // Broken by hand, so the bubble is only as wide as "Insufficient data".
            <>
              Insufficient data <br />
              for breakdown
            </>
          ) : (
            <dl>
              <dt>Lifespan</dt>
              <dd>{formatIhdi(breakdown.lifespan)}</dd>
              <dt>Education</dt>
              <dd>{formatIhdi(breakdown.education)}</dd>
              <dt>Income</dt>
              <dd>{formatIhdi(breakdown.income)}</dd>
            </dl>
          )}
        </span>
      )}
    </span>
  )
}
