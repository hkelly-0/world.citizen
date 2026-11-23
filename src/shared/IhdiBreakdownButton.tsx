import { Fragment, useEffect, useId, useRef, useState } from 'react'
import type { IhdiBreakdown, IhdiEstimateBreakdown } from './countryFacts'
import { formatIncome } from './currencies'
import { loadCurrency } from './settings'
import './IhdiBreakdownButton.css'

// A small "?" beside an IHDI value (in the globe's info panel, and under the
// IHDI flashcard's answer) that opens a bubble with the IHDI's three parts:
// lifespan and education in whole years, and income per year in the currency
// chosen in Settings. None is inequality-adjusted: lifespan is the (mean) life
// expectancy, education the average of expected and mean years of schooling,
// and income the World Bank's median.
// Income is marked "(est.)" when it is the World Bank's model estimate, for a
// country with no survey. Lifespan and education are never marked, as their
// years are UNDP's own figures even when the IHDI is estimated. An estimate
// with no breakdown (null) gets a line saying so instead.
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
  breakdown: IhdiBreakdown | IhdiEstimateBreakdown | null
  noDataNote?: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const bubbleId = useId()

  // A part's value, marked "(est.)" if it was estimated.
  function partValue(part: 'lifespan' | 'education' | 'income') {
    if (breakdown === null) return ''
    const isEstimated = part === 'income' && breakdown.isIncomeEstimated
    // Read each time, so a currency just chosen in Settings is used.
    let value = formatIncome(breakdown.incomeDollars, loadCurrency())
    if (part === 'lifespan') value = `${Math.round(breakdown.lifespanYears)} yrs`
    if (part === 'education') value = `${Math.round(breakdown.educationYears)} yrs`
    if (!isEstimated) return value
    return (
      <>
        {value} <span className="ihdi-breakdown__estimated">(est.)</span>
      </>
    )
  }

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
              <dd>{partValue('lifespan')}</dd>
              <dt>Education</dt>
              <dd>{partValue('education')}</dd>
              <dt>Income</dt>
              <dd>{partValue('income')}</dd>
            </dl>
          )}
        </span>
      )}
    </span>
  )
}
