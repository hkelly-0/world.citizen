import { useRef, useState } from 'react'
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

// The question types ticked to start on the tutorial's Settings step; the user
// can change them before going on.
const SUGGESTED_QUESTION_IDS: QuestionId[] = ['globe', 'population', 'ihdi']

type TutorialProps = {
  // The information chosen in Settings, which the Passport step's familiarity
  // covers. The home country's card asks every question type regardless.
  learnedQuestionIds: QuestionId[]
  countryIcon: CountryIcon
  // Saves the information chosen at the Settings step, as Settings' Save does.
  onSaveSettings: (questionIds: QuestionId[], countryIcon: CountryIcon) => void
  // Called by "Skip tutorial" or the last step's "Finish tutorial"; returns to the main menu.
  onClose: () => void
}

// The app tour, opened by itself on the first visit and from Settings' "Replay
// tutorial": a welcome, then the user chooses their home country, is told the
// app is mainly flashcards, and plays its card with explanations, then is
// shown the Passport, chooses the information to learn in Settings, and is
// shown the Flashcards menu. "Skip tutorial" is
// always in the top-right corner. Its steps have no history entries of their
// own, and on the shown screens only the tutorial's buttons (and Settings'
// choices) work.
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
              onButtonClick={() => setStep('settings')}
              isPinned
            />
          )}
        </>
      )
    }
    if (step === 'settings') {
      return (
        <SettingsMenu
          learnedQuestionIds={SUGGESTED_QUESTION_IDS}
          countryIcon={countryIcon}
          tutorialNote={SETTINGS_NOTE}
          onBack={() => {}}
          onSave={(questionIds, icon) => {
            onSaveSettings(questionIds, icon)
            setStep('flashcards-menu')
          }}
          onEditPassport={() => {}}
          onReplayTutorial={() => {}}
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
            onButtonClick={onClose}
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
      <button className="tutorial__skip" onClick={onClose}>
        Skip tutorial
      </button>
    </>
  )
}
