import { Fragment, lazy, Suspense, useEffect, useState } from 'react'
import { CustomPracticeMenu } from './features/flashcards/CustomPracticeMenu'
import { GLOBE_KINDS, type GlobeKind, type QuestionId } from './features/flashcards/deck'
import { FlashcardsMenu } from './features/flashcards/FlashcardsMenu'
import { FlashcardsView } from './features/flashcards/FlashcardsView'
import {
  offeredMultiCountryQuestionIds,
  type MultiCountryQuestionId,
} from './features/flashcards/multiCountryQuestions'
import { MultiCountryPracticeView } from './features/flashcards/MultiCountryPracticeView'
import { MainMenu } from './features/menu/MainMenu'
import { collectedCountries } from './features/passport/passport'
import { PassportFlashcardView } from './features/passport/PassportFlashcardView'
import { PassportView } from './features/passport/PassportView'
import { DevTools } from './features/dev/DevTools'
import { ExtrasMenu } from './features/extras/ExtrasMenu'
import { NAMING_AREAS } from './features/extras/namingGame'
import { Credits } from './features/settings/Credits'
import { PassportEditor } from './features/settings/PassportEditor'
import { SettingsMenu } from './features/settings/SettingsMenu'
import { Tutorial } from './features/tutorial/Tutorial'
import { loadProgress } from './shared/progress'
import {
  loadCountryIcon,
  loadLearnedQuestionIds,
  saveCountryIcon,
  saveLearnedQuestionIds,
  type CountryIcon,
} from './shared/settings'
import { loadHasSeenTutorial, saveHasSeenTutorial } from './shared/tutorial'

// The map (MapLibre + border data) is large, so it is loaded only when shown.
// This keeps other screens, like the flashcards, fast to open.
const GlobeView = lazy(() => import('./features/globe/GlobeView'))
const NameEveryCountry = lazy(() => import('./features/extras/NameEveryCountry'))

// 'flashcards' is the flashcards menu, 'classic-flashcards' the full country
// cards, 'custom-practice' the choice of question types to practise, and
// 'custom-flashcards' the cards asking only those question types.
// 'settings' chooses which information is learned at all, and
// 'passport-editor' (opened from it) adds or removes Passport countries by
// hand, and 'credits' (also from it) lists who made the data and libraries.
// 'passport' lists the countries seen as flashcards, and
// 'passport-flashcard' plays one of their cards. 'extras' lists the games
// outside the flashcards, such as 'name-every-country' (for the world or one
// continent).
type Screen =
  | 'menu'
  | 'settings'
  | 'passport-editor'
  | 'credits'
  | 'passport'
  | 'passport-flashcard'
  | 'globe'
  | 'flashcards'
  | 'classic-flashcards'
  | 'custom-practice'
  | 'custom-flashcards'
  | 'extras'
  | 'name-every-country'

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
function customMultiCountryQuestionIdsInHistory(): MultiCountryQuestionId[] {
  return history.state?.multiCountryQuestionIds ?? []
}
// The country whose card is played from the Passport, kept the same way.
function passportFlashcardCodeInHistory(): string | null {
  return history.state?.isoAlpha3 ?? null
}
// The area whose countries Name every country asks for, kept the same way.
function namingAreaIdInHistory(): string {
  return history.state?.namingAreaId ?? 'world'
}

export default function App() {
  // Read from history, so reloading the website stays on the same screen.
  const [screen, setScreen] = useState<Screen>(screenInHistory)
  const [customQuestionIds, setCustomQuestionIds] = useState<QuestionId[]>(
    customQuestionIdsInHistory,
  )
  const [customGlobeKinds, setCustomGlobeKinds] = useState<GlobeKind[]>(customGlobeKindsInHistory)
  const [customMultiCountryQuestionIds, setCustomMultiCountryQuestionIds] = useState<
    MultiCountryQuestionId[]
  >(customMultiCountryQuestionIdsInHistory)
  const [passportFlashcardCode, setPassportFlashcardCode] = useState<string | null>(
    passportFlashcardCodeInHistory,
  )
  const [namingAreaId, setNamingAreaId] = useState<string>(namingAreaIdInHistory)
  // The information chosen in Settings. Everything else in the app (info
  // panel, Classic and Custom Practice) shows or asks only these.
  const [learnedQuestionIds, setLearnedQuestionIds] = useState<QuestionId[]>(loadLearnedQuestionIds)
  // The picture shown for each country in the Passport, chosen in Settings.
  const [countryIcon, setCountryIcon] = useState<CountryIcon>(loadCountryIcon)
  // Shown instead of any screen. Opened from the main menu's "Play Tutorial"
  // (offered until the tutorial is finished or skipped, and never once the
  // Passport has countries) and from Settings' "Replay tutorial".
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

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
  function startCustomPractice(
    questionIds: QuestionId[],
    globeKinds: GlobeKind[],
    multiCountryQuestionIds: MultiCountryQuestionId[],
  ) {
    history.replaceState(
      {
        screen: 'custom-flashcards',
        questionIds,
        globeKinds,
        multiCountryQuestionIds,
      },
      '',
    )
    setCustomQuestionIds(questionIds)
    setCustomGlobeKinds(globeKinds)
    setCustomMultiCountryQuestionIds(multiCountryQuestionIds)
    setScreen('custom-flashcards')
  }
  // Opens a country's card from the Passport, with its own history entry, so
  // "Done" and back both return to the Passport.
  function playPassportFlashcard(isoAlpha3: string) {
    history.pushState({ screen: 'passport-flashcard', isoAlpha3 }, '')
    setPassportFlashcardCode(isoAlpha3)
    setScreen('passport-flashcard')
  }
  // Opens Name every country for one area, with its own history entry, so
  // back returns to the Extras menu.
  function playNameEveryCountry(areaId: string) {
    history.pushState({ screen: 'name-every-country', namingAreaId: areaId }, '')
    setNamingAreaId(areaId)
    setScreen('name-every-country')
  }
  function saveSettings(questionIds: QuestionId[], icon: CountryIcon) {
    saveLearnedQuestionIds(questionIds)
    setLearnedQuestionIds(questionIds)
    saveCountryIcon(icon)
    setCountryIcon(icon)
  }
  const goToMenu = () => history.back()
  // Finishing or skipping the tutorial both count as having seen it.
  function closeTutorial() {
    saveHasSeenTutorial()
    setIsTutorialOpen(false)
  }
  // Settings (Replay tutorial) or the Flashcards menu (Play Tutorial) was
  // opened from the main menu, so its history entry becomes the tutorial's
  // guard (see Tutorial.tsx) on top of the main menu's: back asks "Exit
  // tutorial?", and the main menu is shown once the tutorial closes.
  function replayTutorial() {
    history.replaceState({ tutorialGuard: true }, '')
    setScreen('menu')
    setIsTutorialOpen(true)
  }

  // Whether the main menu and Flashcards menu offer "Play Tutorial": until it
  // is finished or skipped, and never once the Passport has countries. Read
  // each time a menu is shown.
  function isTutorialOffered() {
    return !loadHasSeenTutorial() && collectedCountries(loadProgress()).length === 0
  }

  // Goes up each time a dev tool changes the saved progress. Used as the
  // current screen's key, so the screen is rebuilt and reads the new progress.
  const [devChangeCount, setDevChangeCount] = useState(0)

  // The screen being shown, chosen by `screen`.
  function currentScreen() {
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
          showTutorialButton={isTutorialOffered()}
          onPlayTutorial={replayTutorial}
          onBack={goToMenu}
          onOpenClassic={() => replaceScreen('classic-flashcards')}
          onOpenCustomPractice={() => replaceScreen('custom-practice')}
        />
      )
    }
    if (screen === 'classic-flashcards') {
      return (
        <FlashcardsView
          questionIds={learnedQuestionIds}
          learnedQuestionIds={learnedQuestionIds}
          globeKinds={GLOBE_KINDS}
          multiCountryQuestionIds={offeredMultiCountryQuestionIds(learnedQuestionIds)}
          mode="classic"
          countryIcon={countryIcon}
          onBack={goToMenu}
        />
      )
    }
    if (screen === 'custom-practice') {
      return (
        <CustomPracticeMenu
          learnedQuestionIds={learnedQuestionIds}
          passportCodes={collectedCountries(loadProgress()).map((country) => country.isoAlpha3)}
          onBack={goToMenu}
          onGo={startCustomPractice}
        />
      )
    }
    // With only multi-country questions ticked, there are no country cards to
    // mix them in between.
    if (screen === 'custom-flashcards' && customQuestionIds.length === 0) {
      return (
        <MultiCountryPracticeView
          questionIds={customMultiCountryQuestionIds}
          countryIcon={countryIcon}
          onBack={goToMenu}
        />
      )
    }
    if (screen === 'custom-flashcards') {
      return (
        <FlashcardsView
          questionIds={customQuestionIds}
          learnedQuestionIds={learnedQuestionIds}
          globeKinds={customGlobeKinds}
          multiCountryQuestionIds={customMultiCountryQuestionIds}
          mode="custom"
          countryIcon={countryIcon}
          onBack={goToMenu}
        />
      )
    }
    if (screen === 'extras') {
      return <ExtrasMenu onBack={goToMenu} onOpenNameEveryCountry={playNameEveryCountry} />
    }
    if (screen === 'name-every-country') {
      const area = NAMING_AREAS.find((namingArea) => namingArea.id === namingAreaId)
      return (
        <Suspense fallback={<p className="loading">Loading globe…</p>}>
          {/* Back to the Extras menu's history entry. Keyed by area so that
              each area starts a fresh game. */}
          <NameEveryCountry
            key={namingAreaId}
            area={area ?? NAMING_AREAS[0]}
            onBack={() => history.back()}
          />
        </Suspense>
      )
    }
    if (screen === 'settings') {
      return (
        <SettingsMenu
          learnedQuestionIds={learnedQuestionIds}
          countryIcon={countryIcon}
          onBack={goToMenu}
          onSave={saveSettings}
          onEditPassport={() => openScreen('passport-editor')}
          onReplayTutorial={replayTutorial}
          onOpenCredits={() => openScreen('credits')}
        />
      )
    }
    if (screen === 'passport-editor') {
      return (
        <PassportEditor
          learnedQuestionIds={learnedQuestionIds}
          // Back to the Settings history entry.
          onBack={() => history.back()}
        />
      )
    }
    if (screen === 'credits') {
      // Back to the Settings history entry.
      return <Credits onBack={() => history.back()} />
    }
    if (screen === 'passport') {
      return (
        <PassportView
          learnedQuestionIds={learnedQuestionIds}
          countryIcon={countryIcon}
          onBack={goToMenu}
          onPlayFlashcard={playPassportFlashcard}
        />
      )
    }
    if (screen === 'passport-flashcard' && passportFlashcardCode !== null) {
      return (
        <PassportFlashcardView
          // A fresh card each time one is opened.
          key={passportFlashcardCode}
          isoAlpha3={passportFlashcardCode}
          learnedQuestionIds={learnedQuestionIds}
          countryIcon={countryIcon}
          // Back to the Passport's history entry.
          onBack={() => history.back()}
        />
      )
    }
    // Read each time the menu is shown, so it includes countries just studied.
    const passportCount = collectedCountries(loadProgress()).length
    return (
      <MainMenu
        passportCount={passportCount}
        showTutorialButton={isTutorialOffered()}
        // The tutorial adds its own guard entry over the main menu's.
        onPlayTutorial={() => setIsTutorialOpen(true)}
        onOpenGlobe={() => openScreen('globe')}
        onOpenFlashcards={() => openScreen('flashcards')}
        onOpenPassport={() => openScreen('passport')}
        onOpenExtras={() => openScreen('extras')}
        onOpenSettings={() => openScreen('settings')}
      />
    )
  }

  return (
    <>
      {isTutorialOpen ? (
        <Tutorial
          learnedQuestionIds={learnedQuestionIds}
          countryIcon={countryIcon}
          onSaveSettings={saveSettings}
          onClose={closeTutorial}
        />
      ) : (
        <Fragment key={devChangeCount}>{currentScreen()}</Fragment>
      )}
      {/* Left out of the website and APK builds. */}
      {import.meta.env.DEV && <DevTools onChange={() => setDevChangeCount((count) => count + 1)} />}
    </>
  )
}
