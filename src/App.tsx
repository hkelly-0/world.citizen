import { lazy, Suspense } from 'react'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the future flashcards, fast to open.
const MapView = lazy(() => import('./features/map/MapView'))

export default function App() {
  return (
    <Suspense fallback={<p className="loading">Loading globe…</p>}>
      <MapView />
    </Suspense>
  )
}
