import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { QUESTION_IDS, type QuestionId } from '../flashcards/deck'
// Same layout, buttons and checkboxes as the custom practice menu.
import '../menu/MainMenu.css'
import '../flashcards/CustomPracticeMenu.css'

const LABELS: Record<QuestionId, string> = {
  globe: 'Location',
  flag: 'Flag',
  area: 'Area',
  population: 'Population',
  ihdi: 'IHDI',
  capital: 'Capital',
}

type SettingsMenuProps = {
  // The question types currently learned, ticked to start.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
  // Called with the ticked question types, in the order of QUESTION_IDS.
  onSave: (questionIds: QuestionId[]) => void
}

// Lets the user choose which information to learn. Nothing changes until
// "Save" is pressed, which needs at least one ticked. Once saved (or before
// anything is changed) the button reads "Saved" and is disabled.
export function SettingsMenu({ learnedQuestionIds, onBack, onSave }: SettingsMenuProps) {
  const [chosen, setChosen] = useState<QuestionId[]>(learnedQuestionIds)

  function toggle(id: QuestionId) {
    setChosen(chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id])
  }

  const chosenInOrder = QUESTION_IDS.filter((id) => chosen.includes(id))
  const isSaved =
    chosenInOrder.length === learnedQuestionIds.length &&
    chosenInOrder.every((id, i) => id === learnedQuestionIds[i])

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
      <button
        // "Saved" has nothing to go on to, so no arrow.
        className={
          isSaved
            ? 'main-menu__option main-menu__option--centered'
            : 'main-menu__option main-menu__option--centered arrow-button'
        }
        onClick={() => onSave(chosenInOrder)}
        disabled={isSaved || chosen.length === 0}
      >
        {isSaved ? 'Saved' : 'Save'}
      </button>
    </main>
  )
}
