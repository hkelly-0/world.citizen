import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { QUESTION_IDS, type QuestionId } from './deck'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'
import './CustomPracticeMenu.css'

// "Location" covers the globe question, whether it asks to find or name the country.
const QUESTION_LABELS: Record<QuestionId, string> = {
  globe: 'Location',
  area: 'Area',
  population: 'Population',
  ihdi: 'IHDI',
  capital: 'Capital',
}

type CustomPracticeMenuProps = {
  onBack: () => void
  // Called with the ticked question types, in the order of QUESTION_IDS.
  onGo: (questionIds: QuestionId[]) => void
}

// Lets the user tick which question types to practise. "Go" needs at least one.
export function CustomPracticeMenu({ onBack, onGo }: CustomPracticeMenuProps) {
  const [chosenIds, setChosenIds] = useState<QuestionId[]>([])

  function toggle(id: QuestionId) {
    setChosenIds(
      chosenIds.includes(id)
        ? chosenIds.filter((chosen) => chosen !== id)
        : QUESTION_IDS.filter((other) => other === id || chosenIds.includes(other)),
    )
  }

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1 className="custom-practice__title">Select which question types to see today</h1>
      <fieldset className="custom-practice__choices">
        {QUESTION_IDS.map((id) => (
          <label key={id} className="custom-practice__choice">
            {QUESTION_LABELS[id]}
            <input type="checkbox" checked={chosenIds.includes(id)} onChange={() => toggle(id)} />
          </label>
        ))}
      </fieldset>
      <button
        className="main-menu__option"
        onClick={() => onGo(chosenIds)}
        disabled={chosenIds.length === 0}
      >
        Go
      </button>
    </main>
  )
}
