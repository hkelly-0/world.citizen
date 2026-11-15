import { lazy, Suspense } from 'react'
import './SeeOnGlobe.css'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
const GlobeView = lazy(() => import('../globe/GlobeView'))

// "See on Globe" opens the globe screen over a flashcard screen, with the
// card's country selected. The flashcard screen stays mounted (hidden)
// underneath, so going back returns to the card exactly as it was left.
// Its history entry is handled by useSeeOnGlobe.

// The globe screen as opened from a flashcard, working as it does from the
// main menu except that its back button returns to the flashcards.
export function SeeOnGlobeScreen({ code }: { code: string }) {
  return (
    <Suspense fallback={<p className="loading">Loading globe…</p>}>
      <GlobeView initialCountryCode={code} backLabel="← Flashcards" onBack={() => history.back()} />
    </Suspense>
  )
}

// "→" and a globe, in the top-right corner of the flashcard screens (not the
// tutorial's card). The globe is the "globe" icon from Feather Icons (MIT
// licence).
export function SeeOnGlobeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="see-on-globe"
      onClick={onClick}
      aria-label="See on Globe"
      title="See on Globe"
    >
      →
      <svg className="see-on-globe__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>
  )
}
