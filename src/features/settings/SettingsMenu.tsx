import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import type { CountryIcon } from '../../shared/settings'
import { QUESTION_IDS, type QuestionId } from '../flashcards/deck'
import { TutorialNote } from '../tutorial/TutorialNote'
import { ConfirmMessage } from './ConfirmMessage'
// Same layout, buttons and checkboxes as the custom practice menu.
import '../menu/MainMenu.css'
import '../flashcards/CustomPracticeMenu.css'
import './SettingsMenu.css'

const LABELS: Record<QuestionId, string> = {
  globe: 'Location',
  flag: 'Flag',
  area: 'Area',
  population: 'Population',
  ihdi: 'IHDI',
  capital: 'Capital',
  history: 'History',
  people: 'People',
  economy: 'Economy',
  // Shortened to fit on one line beside its checkbox.
  internationalRelations: 'Int. Relations',
}

const ICON_LABELS: { icon: CountryIcon; label: string }[] = [
  { icon: 'outline', label: 'Outline' },
  { icon: 'flag', label: 'Flag' },
]

type SettingsMenuProps = {
  // The question types currently learned, shown ticked.
  learnedQuestionIds: QuestionId[]
  // The picture currently shown for each country in the Passport, shown chosen.
  countryIcon: CountryIcon
  onBack: () => void
  // Called on every change with the ticked question types, in the order of
  // QUESTION_IDS, and the chosen country icon, to save them.
  onSave: (questionIds: QuestionId[], countryIcon: CountryIcon) => void
  // Opens the Passport editor, once the user has confirmed.
  onEditPassport: () => void
  // Closes Settings and starts the tutorial again.
  onReplayTutorial: () => void
  // Given when shown as a step of the tutorial: this note, with a Next button
  // that calls onTutorialNext, replaces the back button and the buttons below
  // the choices.
  tutorialNote?: string
  onTutorialNext?: () => void
}

// Lets the user choose which information to learn, and whether the Passport
// shows each country's outline or flag. Every change is saved straight away.
// At least one box stays ticked: the last ticked one is disabled. Below,
// "Manually edit Passport" asks "Are you sure?" before opening the Passport
// editor, and "Replay tutorial" starts the tutorial again.
export function SettingsMenu({
  learnedQuestionIds,
  countryIcon,
  onBack,
  onSave,
  onEditPassport,
  onReplayTutorial,
  tutorialNote,
  onTutorialNext,
}: SettingsMenuProps) {
  const [isConfirmingEdit, setIsConfirmingEdit] = useState(false)

  function toggle(id: QuestionId) {
    const isTicked = learnedQuestionIds.includes(id)
    const ticked = QUESTION_IDS.filter((other) =>
      other === id ? !isTicked : learnedQuestionIds.includes(other),
    )
    onSave(ticked, countryIcon)
  }

  return (
    <main className="main-menu">
      {tutorialNote === undefined && <BackButton onClick={onBack} />}
      <h1 className="custom-practice__title">Information I want to learn:</h1>
      <fieldset className="custom-practice__choices">
        {QUESTION_IDS.map((id) => (
          <label key={id} className="custom-practice__choice">
            {LABELS[id]}
            <input
              type="checkbox"
              checked={learnedQuestionIds.includes(id)}
              // The last ticked box can't be unticked, so something is always learned.
              disabled={learnedQuestionIds.length === 1 && learnedQuestionIds[0] === id}
              onChange={() => toggle(id)}
            />
          </label>
        ))}
      </fieldset>
      <div className="settings__icon-choice">
        <span id="country-icon-label">Main icon for countries</span>
        {/* Two joined buttons; the chosen one is highlighted. */}
        <div className="settings__toggle" role="group" aria-labelledby="country-icon-label">
          {ICON_LABELS.map(({ icon, label }) => (
            <button
              key={icon}
              className={
                icon === countryIcon
                  ? 'settings__toggle-option settings__toggle-option--chosen'
                  : 'settings__toggle-option'
              }
              aria-pressed={icon === countryIcon}
              onClick={() => onSave(learnedQuestionIds, icon)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tutorialNote !== undefined ? (
        <TutorialNote text={tutorialNote} buttonLabel="Next" onButtonClick={onTutorialNext} />
      ) : (
        <>
          {isConfirmingEdit ? (
            <ConfirmMessage
              message="Are you sure? Removing a country from your Passport deletes all its progress."
              confirmLabel="Continue"
              onConfirm={onEditPassport}
              onCancel={() => setIsConfirmingEdit(false)}
            />
          ) : (
            <button
              className="main-menu__option main-menu__option--centered arrow-button"
              onClick={() => setIsConfirmingEdit(true)}
            >
              Manually edit Passport
            </button>
          )}
          <button
            className="main-menu__option main-menu__option--centered arrow-button"
            onClick={onReplayTutorial}
          >
            Replay tutorial
          </button>
        </>
      )}
    </main>
  )
}
