import { lazy, Suspense } from 'react'

// The globe (three.js + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the future flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))
const MapView = lazy(() => import('./features/map/MapView'))

// Prototype only: the MapLibre map is shown by default. Add ?view=globe to the
// URL to see the old globe.gl globe, so the two can be compared.
const SHOW_OLD_GLOBE = new URLSearchParams(window.location.search).get('view') === 'globe'

export default function App() {
  return (
    <Suspense fallback={<p className="loading">Loading globe…</p>}>
      {SHOW_OLD_GLOBE ? <GlobeView /> : <MapView />}
    </Suspense>
  )
}
