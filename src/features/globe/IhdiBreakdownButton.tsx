import { useEffect, useId, useRef, useState } from 'react'
import type { IhdiBreakdown } from '../../shared/countryFacts'
import { formatIhdi } from '../../shared/statRanges'
import './IhdiBreakdownButton.css'

// A small "?" beside the info panel's IHDI value that opens a bubble with the
// IHDI's three inequality-adjusted parts, on the same 0–10 scale as the IHDI.
// An estimated IHDI has no breakdown (null), so the bubble says so instead.
// Tapping the "?" again, or anywhere else in the info panel, closes it. Taps
// outside the panel (e.g. selecting another country on the globe) leave it
// open, so the breakdowns can be compared.
export function IhdiBreakdownButton({ breakdown }: { breakdown: IhdiBreakdown | null }) {
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
        aria-label="IHDI breakdown"
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
        <span id={bubbleId} className="ihdi-breakdown__bubble">
          {breakdown === null ? (
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
