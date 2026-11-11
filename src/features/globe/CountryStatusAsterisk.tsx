import { useEffect, useId, useRef, useState } from 'react'
import './CountryStatusAsterisk.css'

// The countries among the 197 that aren't UN members, by ISO alpha-3 code,
// with the note their asterisk shows.
const STATUS_NOTES: Record<string, string> = {
  PSE: 'UN observer state',
  VAT: 'UN observer state',
  TWN: 'Partially recognized state',
  XKX: 'Partially recognized state',
}

// A "*" after the name in the info panel's heading, for the countries in
// STATUS_NOTES, that opens a bubble with the country's note. Shows nothing for
// other countries. Opens and closes like the IHDI's "?" (IhdiBreakdownButton):
// tapping the "*" again, or anywhere else in the info panel, closes it.
export function CountryStatusAsterisk({ isoAlpha3 }: { isoAlpha3: string | null }) {
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

  const note = isoAlpha3 === null ? undefined : STATUS_NOTES[isoAlpha3]
  if (note === undefined) return null

  return (
    <span ref={wrapperRef} className="country-status">
      <button
        className="country-status__button"
        aria-label="Status"
        aria-expanded={isOpen}
        aria-controls={bubbleId}
        onClick={() => setIsOpen(!isOpen)}
      >
        *
      </button>
      {isOpen && (
        <span id={bubbleId} className="country-status__bubble">
          {note}
        </span>
      )}
    </span>
  )
}
