import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import type { CountryIcon } from '../../shared/settings'
import {
  INFO_QUESTION_IDS,
  QUESTION_IDS,
  isInfoQuestion,
  type QuestionId,
} from '../flashcards/deck'
import { TutorialNote } from '../tutorial/TutorialNote'
import { ConfirmMessage } from './ConfirmMessage'
// The main menu's centred column layout, with the cards and switches shared
// with Custom Practice.
import '../menu/MainMenu.css'
import '../../shared/OptionsPage.css'
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
  // Shortened to fit on one line beside its switch.
  internationalRelations: 'Int. Relations',
}

// The question types that aren't info questions, listed under "Fundamentals".
const FACT_QUESTION_IDS = QUESTION_IDS.filter((id) => !isInfoQuestion(id))

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
// editor, and "Replay tutorial" starts the tutorial again. The settings are
// grouped into cards under small headings; each question type's checkbox is
// drawn as a switch.
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

  // One switch row per question type in the list given.
  function questionSwitches(questionIds: QuestionId[]) {
    return questionIds.map((id) => (
      <label key={id} className="options-page__row options-page__switch-row">
        {LABELS[id]}
        <input
          type="checkbox"
          className="options-page__switch-input"
          checked={learnedQuestionIds.includes(id)}
          // The last ticked box can't be unticked, so something is always learned.
          disabled={learnedQuestionIds.length === 1 && learnedQuestionIds[0] === id}
          onChange={() => toggle(id)}
        />
        {/* The visible switch, drawn from the hidden checkbox's state. */}
        <span className="options-page__switch" aria-hidden="true" />
      </label>
    ))
  }

  return (
    <main className="main-menu options-page">
      {tutorialNote === undefined && <BackButton onClick={onBack} />}
      <h1 className="options-page__title">Settings</h1>
      <section className="options-page__section">
        <h2 className="options-page__heading">Information I want to learn</h2>
        <div className="options-page__card">
          <fieldset className="options-page__group">
            <legend className="options-page__group-label">Fundamentals</legend>
            {questionSwitches(FACT_QUESTION_IDS)}
          </fieldset>
          <fieldset className="options-page__group">
            <legend className="options-page__group-label">Textual info</legend>
            {questionSwitches(INFO_QUESTION_IDS)}
          </fieldset>
        </div>
      </section>
      <section className="options-page__section">
        <h2 className="options-page__heading">Passport</h2>
        <div className="options-page__card">
          <div className="options-page__row settings__icon-choice">
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
          {tutorialNote === undefined &&
            (isConfirmingEdit ? (
              <div className="options-page__row">
                <ConfirmMessage
                  message="Are you sure? Removing a country from your Passport deletes all its progress."
                  confirmLabel="Continue"
                  onConfirm={onEditPassport}
                  onCancel={() => setIsConfirmingEdit(false)}
                />
              </div>
            ) : (
              <button
                className="options-page__row settings__action arrow-button"
                onClick={() => setIsConfirmingEdit(true)}
              >
                Manually edit Passport
              </button>
            ))}
        </div>
      </section>
      {tutorialNote !== undefined ? (
        <TutorialNote text={tutorialNote} buttonLabel="Next" onButtonClick={onTutorialNext} />
      ) : (
        <section className="options-page__section">
          <h2 className="options-page__heading">Help</h2>
          <div className="options-page__card">
            <button
              className="options-page__row settings__action arrow-button"
              onClick={onReplayTutorial}
            >
              Replay tutorial
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
