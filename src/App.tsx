import { lazy, Suspense, useEffect, useState } from 'react'
import { CustomPracticeMenu } from './features/flashcards/CustomPracticeMenu'
import { GLOBE_KINDS, type GlobeKind, type QuestionId } from './features/flashcards/deck'
import { FlashcardsMenu } from './features/flashcards/FlashcardsMenu'
import { FlashcardsView } from './features/flashcards/FlashcardsView'
import { MainMenu } from './features/menu/MainMenu'
import { collectedCountries } from './features/passport/passport'
import { PassportView } from './features/passport/PassportView'
import { SettingsMenu } from './features/settings/SettingsMenu'
import { loadProgress } from './shared/progress'
import { loadLearnedQuestionIds, saveLearnedQuestionIds } from './shared/settings'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))

// 'flashcards' is the flashcards menu, 'classic-flashcards' the full country
// cards, 'custom-practice' the choice of question types to practise, and
// 'custom-flashcards' the cards asking only those question types.
// 'settings' chooses which information is learned at all. 'passport' lists
// the countries seen as flashcards.
type Screen =
  | 'menu'
  | 'settings'
  | 'passport'
  | 'globe'
  | 'flashcards'
  | 'classic-flashcards'
  | 'custom-practice'
  | 'custom-flashcards'

// Opening a screen adds a browser history entry (the URL stays the same), so
// the browser's back button, and Android's, return to the main menu. The main
// menu is the first entry, which has no state.
function screenInHistory(): Screen {
  return history.state?.screen ?? 'menu'
}

// The question types chosen for custom practice are kept in its history entry
// too, so reloading the website keeps practising the same ones.
function customQuestionIdsInHistory(): QuestionId[] {
  return history.state?.questionIds ?? []
}
function customGlobeKindsInHistory(): GlobeKind[] {
  return history.state?.globeKinds ?? []
}

export default function App() {
  // Read from history, so reloading the website stays on the same screen.
  const [screen, setScreen] = useState<Screen>(screenInHistory)
  const [customQuestionIds, setCustomQuestionIds] = useState<QuestionId[]>(customQuestionIdsInHistory)
  const [customGlobeKinds, setCustomGlobeKinds] = useState<GlobeKind[]>(customGlobeKindsInHistory)
  // The information chosen in Settings. Everything else in the app (info
  // panel, Classic and Custom Practice) shows or asks only these.
  const [learnedQuestionIds, setLearnedQuestionIds] = useState<QuestionId[]>(loadLearnedQuestionIds)

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
  // Leaves the custom practice choice the same way, so back goes straight to
  // the main menu.
  function startCustomPractice(questionIds: QuestionId[], globeKinds: GlobeKind[]) {
    history.replaceState({ screen: 'custom-flashcards', questionIds, globeKinds }, '')
    setCustomQuestionIds(questionIds)
    setCustomGlobeKinds(globeKinds)
    setScreen('custom-flashcards')
  }
  function saveSettings(questionIds: QuestionId[]) {
    saveLearnedQuestionIds(questionIds)
    setLearnedQuestionIds(questionIds)
  }
  const goToMenu = () => history.back()

  if (screen === 'globe') {
    return (
      <Suspense fallback={<p className="loading">Loading globe…</p>}>
        <GlobeView learnedQuestionIds={learnedQuestionIds} onBack={goToMenu} />
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
    return (
      <FlashcardsView questionIds={learnedQuestionIds} globeKinds={GLOBE_KINDS} onBack={goToMenu} />
    )
  }
  if (screen === 'custom-practice') {
    return (
      <CustomPracticeMenu
        learnedQuestionIds={learnedQuestionIds}
        onBack={goToMenu}
        onGo={startCustomPractice}
      />
    )
  }
  if (screen === 'custom-flashcards') {
    return (
      <FlashcardsView
        questionIds={customQuestionIds}
        globeKinds={customGlobeKinds}
        onBack={goToMenu}
      />
    )
  }
  if (screen === 'settings') {
    return (
      <SettingsMenu
        learnedQuestionIds={learnedQuestionIds}
        onBack={goToMenu}
        onSave={saveSettings}
      />
    )
  }
  if (screen === 'passport') {
    return <PassportView onBack={goToMenu} />
  }
  return (
    <MainMenu
      // Read each time the menu is shown, so it includes countries just studied.
      passportCount={collectedCountries(loadProgress()).length}
      onOpenGlobe={() => openScreen('globe')}
      onOpenFlashcards={() => openScreen('flashcards')}
      onOpenPassport={() => openScreen('passport')}
      onOpenSettings={() => openScreen('settings')}
    />
  )
}
