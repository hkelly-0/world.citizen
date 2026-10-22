import { lazy, Suspense, useEffect, useState } from 'react'
import { CustomPracticeMenu } from './features/flashcards/CustomPracticeMenu'
import { FlashcardsMenu } from './features/flashcards/FlashcardsMenu'
import { FlashcardsView } from './features/flashcards/FlashcardsView'
import { MainMenu } from './features/menu/MainMenu'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))

// 'flashcards' is the flashcards menu, 'classic-flashcards' the full country
// cards, and 'custom-practice' the choice of question types to practise.
type Screen = 'menu' | 'globe' | 'flashcards' | 'classic-flashcards' | 'custom-practice'

// Opening a screen adds a browser history entry (the URL stays the same), so
// the browser's back button, and Android's, return to the main menu. The main
// menu is the first entry, which has no state.
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
  // Swaps the current screen's history entry for the next screen's, so going
  // back skips the current screen. Used to leave the flashcards menu, so back
  // from the flashcards goes straight to the main menu.
  function replaceScreen(next: Screen) {
    history.replaceState({ screen: next }, '')
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
    return (
      <FlashcardsMenu
        onBack={goToMenu}
        onOpenClassic={() => replaceScreen('classic-flashcards')}
        onOpenCustomPractice={() => replaceScreen('custom-practice')}
      />
    )
  }
  if (screen === 'classic-flashcards') {
    return <FlashcardsView onBack={goToMenu} />
  }
  if (screen === 'custom-practice') {
    // Custom practice cards aren't built yet, so "Go" does nothing for now.
    return <CustomPracticeMenu onBack={goToMenu} onGo={() => {}} />
  }
  return (
    <MainMenu
      onOpenGlobe={() => openScreen('globe')}
      onOpenFlashcards={() => openScreen('flashcards')}
    />
  )
}
