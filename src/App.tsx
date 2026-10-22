import { lazy, Suspense, useEffect, useState } from 'react'
import { FlashcardsView } from './features/flashcards/FlashcardsView'
import { MainMenu } from './features/menu/MainMenu'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))

type Screen = 'menu' | 'globe' | 'flashcards'

// Opening a screen adds a browser history entry (the URL stays the same), so
// the browser's back button, and Android's, return to the menu. The menu is
// the first entry, which has no state.
function screenInHistory(): Screen {
  return history.state?.screen ?? 'menu'
}

export default function App() {
  // Read from history, so reloading the website stays on the same screen.
  const [screen, setScreen] = useState<Screen>(screenInHistory)

  // Going back (or forward) through history shows that entry's screen.
  useEffect(() => {
    const showScreenInHistory = () => setScreen(screenInHistory())
    window.addEventListener('popstate', showScreenInHistory)
    return () => window.removeEventListener('popstate', showScreenInHistory)
  }, [])

  function openScreen(next: Screen) {
    history.pushState({ screen: next }, '')
    setScreen(next)
  }
  const goToMenu = () => history.back()

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
      onOpenGlobe={() => openScreen('globe')}
      onOpenFlashcards={() => openScreen('flashcards')}
    />
  )
}
