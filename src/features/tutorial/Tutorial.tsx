import { useEffect, useRef, useState } from 'react'
import { Popup } from '../../shared/Popup'
import type { CountryIcon } from '../../shared/settings'
import type { QuestionId } from '../flashcards/deck'
import { FlashcardsMenu } from '../flashcards/FlashcardsMenu'
import { SpinningLogo } from '../menu/SpinningLogo'
import { useFitTextToWidth } from '../menu/useFitTextToWidth'
import { PassportView } from '../passport/PassportView'
import { SettingsMenu } from '../settings/SettingsMenu'
import { HomeCountryCard } from './HomeCountryCard'
import { HomeCountryChoice } from './HomeCountryChoice'
import { TutorialNote } from './TutorialNote'
import {
  FLASHCARDS_INTRO,
  FLASHCARDS_MENU_NOTE,
  PASSPORT_NOTE,
  PASSPORT_SECOND_NOTE,
  SETTINGS_NOTE,
} from './tutorialNotes'
// The first three steps are laid out like a flashcard.
import '../flashcards/FlashcardsView.css'
import '../flashcards/Flashcard.css'
import '../menu/MainMenu.css'
import './Tutorial.css'

// The tutorial's steps, in order. 'passport', 'passport-second', 'settings'
// and 'flashcards-menu' show the real screens with a note over them.
type TutorialStep =
  | 'welcome'
  | 'home-country'
  | 'flashcards-intro'
  | 'home-card'
  | 'passport'
  | 'passport-second'
  | 'settings'
  | 'flashcards-menu'

// The tutorial adds a history entry of its own on top of the main menu's, so
// that browser or Android back pops it and asks "Exit tutorial?" instead of
// leaving the app. Replay tutorial puts it in place of Settings' entry.
function isTutorialGuardInHistory(): boolean {
  return history.state?.tutorialGuard === true
}

// The question types saved as learned when the tutorial's Settings step opens;
// the user can change them there before going on.
const SUGGESTED_QUESTION_IDS: QuestionId[] = ['globe', 'population', 'ihdi']

type TutorialProps = {
  // The information chosen in Settings, which the Passport step's familiarity
  // covers. The home country's card asks every question type regardless.
  learnedQuestionIds: QuestionId[]
  countryIcon: CountryIcon
  // Saves the information chosen at the Settings step, as Settings does on
  // every change.
  onSaveSettings: (questionIds: QuestionId[], countryIcon: CountryIcon) => void
  // Called by "Skip tutorial", the last step's "Finish tutorial" or Yes on
  // "Exit tutorial?"; returns to the main menu.
  onClose: () => void
}

// The app tour, opened by itself on the first visit and from Settings' "Replay
// tutorial": a welcome, then the user chooses their home country, is told the
// app is mainly flashcards, and plays its card with explanations, then is
// shown the Passport, chooses the information to learn in Settings, and is
// shown the Flashcards menu. "Skip tutorial" is
// always in the top-right corner, and back asks "Exit tutorial?" at any step.
// Its steps have no history entries of their own, and on the shown screens
// only the tutorial's buttons (and Settings' choices) work.
export function Tutorial({
  learnedQuestionIds,
  countryIcon,
  onSaveSettings,
  onClose,
}: TutorialProps) {
  const [step, setStep] = useState<TutorialStep>('welcome')
  // Chosen at the 'home-country' step.
  const [homeCode, setHomeCode] = useState<string | null>(null)
  // Sizes "world.citizen" on the welcome so it spans the column exactly, like
  // the main menu's title. The welcome is the first step, so it is shown when
  // this runs.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const appNameRef = useRef<HTMLSpanElement>(null)
  useFitTextToWidth(titleRef, appNameRef)
  // True while "Exit tutorial?" is shown, after back.
  const [isConfirmingExit, setIsConfirmingExit] = useState(false)
  // Set when Skip or Finish takes the guard entry off, so the 'popstate' that
  // follows doesn't ask "Exit tutorial?".
  const isLeavingRef = useRef(false)

  // Not added again if it is already there, e.g. after reloading the website
  // or from Replay tutorial.
  useEffect(() => {
    if (!isTutorialGuardInHistory()) {
      history.pushState({ ...history.state, tutorialGuard: true }, '')
    }
  }, [])

  // Back pops the guard, landing on the main menu's entry.
  useEffect(() => {
    function confirmExitIfGuardLeft() {
      if (isTutorialGuardInHistory() || isLeavingRef.current) return
      setIsConfirmingExit(true)
    }
    window.addEventListener('popstate', confirmExitIfGuardLeft)
    return () => window.removeEventListener('popstate', confirmExitIfGuardLeft)
  }, [])

  // Skip and Finish take the guard entry off first, so back from the main
  // menu doesn't land on it.
  function leave() {
    if (isTutorialGuardInHistory()) {
      isLeavingRef.current = true
      history.back()
    }
    onClose()
  }

  // Stays in the tutorial after "Exit tutorial?", putting back the guard that
  // back popped.
  function cancelExit() {
    history.pushState({ ...history.state, tutorialGuard: true }, '')
    setIsConfirmingExit(false)
  }

  function currentStep() {
    if (step === 'home-country') {
      return (
        <HomeCountryChoice
          onChoose={(isoAlpha3) => {
            setHomeCode(isoAlpha3)
            setStep('flashcards-intro')
          }}
        />
      )
    }
    if (step === 'flashcards-intro') {
      return (
        <main className="flashcards-view">
          <article className="flashcard">
            <div className="flashcard__body">
              <TutorialNote text={FLASHCARDS_INTRO} />
            </div>
            <button
              className="flashcard__next arrow-button tutorial__green-button"
              onClick={() => setStep('home-card')}
            >
              Next
            </button>
          </article>
        </main>
      )
    }
    if (step === 'home-card' && homeCode !== null) {
      return (
        <HomeCountryCard
          isoAlpha3={homeCode}
          learnedQuestionIds={learnedQuestionIds}
          countryIcon={countryIcon}
          onContinue={() => setStep('passport')}
        />
      )
    }
    // The Passport is explained in two notes, one after the other.
    if (step === 'passport' || step === 'passport-second') {
      return (
        <>
          {/* `inert` stops the screen's own buttons working. */}
          <div className="tutorial__screen" inert>
            <PassportView
              learnedQuestionIds={learnedQuestionIds}
              countryIcon={countryIcon}
              onBack={() => {}}
              onPlayFlashcard={() => {}}
            />
          </div>
          {step === 'passport' ? (
            <TutorialNote
              text={PASSPORT_NOTE}
              buttonLabel="Next"
              onButtonClick={() => setStep('passport-second')}
              isPinned
            />
          ) : (
            <TutorialNote
              text={PASSPORT_SECOND_NOTE}
              buttonLabel="Next"
              onButtonClick={() => {
                onSaveSettings(SUGGESTED_QUESTION_IDS, countryIcon)
                setStep('settings')
              }}
              isPinned
            />
          )}
        </>
      )
    }
    if (step === 'settings') {
      return (
        <SettingsMenu
          learnedQuestionIds={learnedQuestionIds}
          countryIcon={countryIcon}
          tutorialNote={SETTINGS_NOTE}
          onTutorialNext={() => setStep('flashcards-menu')}
          onBack={() => {}}
          onSave={onSaveSettings}
          onEditPassport={() => {}}
          onReplayTutorial={() => {}}
          onOpenCredits={() => {}}
        />
      )
    }
    if (step === 'flashcards-menu') {
      return (
        <>
          <div className="tutorial__screen" inert>
            <FlashcardsMenu
              onBack={() => {}}
              onOpenClassic={() => {}}
              onOpenCustomPractice={() => {}}
            />
          </div>
          <TutorialNote
            text={FLASHCARDS_MENU_NOTE}
            buttonLabel="Finish tutorial"
            buttonHasArrow={false}
            onButtonClick={leave}
            isPinned
          />
        </>
      )
    }
    return (
      <main className="flashcards-view">
        <article className="flashcard tutorial__welcome-card">
          <div className="flashcard__body">
            <SpinningLogo className="main-menu__logo tutorial__logo" />
            <h1 className="tutorial__title" ref={titleRef}>
              Welcome to <br />
              <span className="main-menu__title-text" ref={appNameRef}>
                world.citizen
              </span>
            </h1>
            <p className="flashcard__question tutorial__intro">
              Learn every country in the world: where it is, its population, its level of
              development, and lots more. Let's start with the country you know best.
            </p>
          </div>
          <button
            className="flashcard__next arrow-button tutorial__green-button"
            onClick={() => setStep('home-country')}
          >
            Start
          </button>
        </article>
      </main>
    )
  }

  return (
    <>
      {currentStep()}
      <button className="tutorial__skip" onClick={leave}>
        Skip tutorial
      </button>
      {/* Back already took the guard off, so Yes just closes the tutorial. */}
      {isConfirmingExit && (
        <Popup
          title="Exit tutorial?"
          isConfirmation
          buttons={[
            { label: 'Cancel', onClick: cancelExit },
            { label: 'Yes', onClick: onClose },
          ]}
        />
      )}
    </>
  )
}
