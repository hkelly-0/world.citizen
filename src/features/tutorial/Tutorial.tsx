import { useState } from 'react'
import type { CountryIcon } from '../../shared/settings'
import type { QuestionId } from '../flashcards/deck'
import { FlashcardsMenu } from '../flashcards/FlashcardsMenu'
import { SpinningLogo } from '../menu/SpinningLogo'
import { PassportView } from '../passport/PassportView'
import { SettingsMenu } from '../settings/SettingsMenu'
import { HomeCountryCard } from './HomeCountryCard'
import { HomeCountryChoice } from './HomeCountryChoice'
import { TutorialNote } from './TutorialNote'
import { FLASHCARDS_MENU_NOTE, PASSPORT_NOTE, SETTINGS_NOTE } from './tutorialNotes'
import '../menu/MainMenu.css'
import './Tutorial.css'

// The tutorial's steps, in order. 'passport', 'settings' and
// 'flashcards-menu' show the real screens with a note over them.
type TutorialStep =
  'welcome' | 'home-country' | 'home-card' | 'passport' | 'settings' | 'flashcards-menu'

type TutorialProps = {
  // The information chosen in Settings, asked on the home country's card.
  learnedQuestionIds: QuestionId[]
  countryIcon: CountryIcon
  // Saves the information chosen at the Settings step, as Settings' Save does.
  onSaveSettings: (questionIds: QuestionId[], countryIcon: CountryIcon) => void
  // Called by "Skip tutorial" or the last step's Finish; returns to the main menu.
  onClose: () => void
}

// The app tour, opened by itself on the first visit and from Settings' "Replay
// tutorial": a welcome, then the user chooses their home country and plays its
// card with explanations, then is shown the Passport, chooses the information
// to learn in Settings, and is shown the Flashcards menu. "Skip tutorial" is
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

  function currentStep() {
    if (step === 'home-country') {
      return (
        <HomeCountryChoice
          onChoose={(isoAlpha3) => {
            setHomeCode(isoAlpha3)
            setStep('home-card')
          }}
        />
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
    if (step === 'passport') {
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
          <TutorialNote
            text={PASSPORT_NOTE}
            buttonLabel="Next"
            onButtonClick={() => setStep('settings')}
            isPinned
          />
        </>
      )
    }
    if (step === 'settings') {
      return (
        <SettingsMenu
          // Nothing ticked, so the user chooses for themselves.
          learnedQuestionIds={[]}
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
            buttonLabel="Finish"
            buttonHasArrow={false}
            onButtonClick={onClose}
            isPinned
          />
        </>
      )
    }
    return (
      <main className="main-menu">
        <SpinningLogo className="main-menu__logo" />
        <h1 className="tutorial__title">Welcome to world.citizen</h1>
        <p className="tutorial__intro">
          Learn every country in the world: where it is, its flag, its capital and more. Let's start
          with the one you know best.
        </p>
        <button
          className="main-menu__option main-menu__option--centered arrow-button"
          onClick={() => setStep('home-country')}
        >
          Start
        </button>
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
