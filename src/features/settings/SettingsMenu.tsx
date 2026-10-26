import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import type { CountryIcon } from '../../shared/settings'
import { QUESTION_IDS, type QuestionId } from '../flashcards/deck'
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
}

const ICON_LABELS: { icon: CountryIcon; label: string }[] = [
  { icon: 'outline', label: 'Outline' },
  { icon: 'flag', label: 'Flag' },
]

type SettingsMenuProps = {
  // The question types currently learned, ticked to start.
  learnedQuestionIds: QuestionId[]
  // The picture currently shown for each country in the Passport, chosen to start.
  countryIcon: CountryIcon
  onBack: () => void
  // Called with the ticked question types, in the order of QUESTION_IDS, and
  // the chosen country icon.
  onSave: (questionIds: QuestionId[], countryIcon: CountryIcon) => void
}

// Lets the user choose which information to learn, and whether the Passport
// shows each country's outline or flag. Nothing changes until
// "Save" is pressed, which needs at least one ticked. Once saved (or before
// anything is changed) the button reads "Saved" and is disabled.
export function SettingsMenu({
  learnedQuestionIds,
  countryIcon,
  onBack,
  onSave,
}: SettingsMenuProps) {
  const [chosen, setChosen] = useState<QuestionId[]>(learnedQuestionIds)
  const [chosenIcon, setChosenIcon] = useState<CountryIcon>(countryIcon)

  function toggle(id: QuestionId) {
    setChosen(chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id])
  }

  const chosenInOrder = QUESTION_IDS.filter((id) => chosen.includes(id))
  const isSaved =
    chosenInOrder.length === learnedQuestionIds.length &&
    chosenInOrder.every((id, i) => id === learnedQuestionIds[i]) &&
    chosenIcon === countryIcon

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1 className="custom-practice__title">Information I want to learn:</h1>
      <fieldset className="custom-practice__choices">
        {QUESTION_IDS.map((id) => (
          <label key={id} className="custom-practice__choice">
            {LABELS[id]}
            <input type="checkbox" checked={chosen.includes(id)} onChange={() => toggle(id)} />
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
                icon === chosenIcon
                  ? 'settings__toggle-option settings__toggle-option--chosen'
                  : 'settings__toggle-option'
              }
              aria-pressed={icon === chosenIcon}
              onClick={() => setChosenIcon(icon)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <button
        // "Saved" has nothing to go on to, so no arrow.
        className={
          isSaved
            ? 'main-menu__option main-menu__option--centered'
            : 'main-menu__option main-menu__option--centered arrow-button'
        }
        onClick={() => onSave(chosenInOrder, chosenIcon)}
        disabled={isSaved || chosen.length === 0}
      >
        {isSaved ? 'Saved' : 'Save'}
      </button>
    </main>
  )
}
