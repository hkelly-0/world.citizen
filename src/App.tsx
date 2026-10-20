import { lazy, Suspense } from 'react'

// The globe (three.js + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the future flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))

export default function App() {
  return (
    <Suspense fallback={<p className="loading">Loading globe…</p>}>
      <GlobeView />
    </Suspense>
  )
}
