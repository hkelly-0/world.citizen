import { lazy, Suspense, useState } from 'react'
import { FlashcardsView } from './features/flashcards/FlashcardsView'
import { MainMenu } from './features/menu/MainMenu'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))

type Screen = 'menu' | 'globe' | 'flashcards'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const goToMenu = () => setScreen('menu')

  if (screen === 'globe') {
    return (
      <Suspense fallback={<p className="loading">Loading globe…</p>}>
        <GlobeView onBack={goToMenu} />
      </Suspense>
    )
  }
  if (screen === 'flashcards') {
    return <FlashcardsView onBack={goToMenu} />
  }
  return (
    <MainMenu
      onOpenGlobe={() => setScreen('globe')}
      onOpenFlashcards={() => setScreen('flashcards')}
    />
  )
}
