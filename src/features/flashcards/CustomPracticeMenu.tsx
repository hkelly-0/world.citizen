import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { GLOBE_KINDS, QUESTION_IDS, type GlobeKind, type QuestionId } from './deck'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'
import './CustomPracticeMenu.css'

// One checkbox each. The two globe options are both the 'globe' question type.
// Borders isn't a question type: it has no FSRS progress and isn't in Settings.
type Choice = GlobeKind | Exclude<QuestionId, 'globe'> | 'borders'
const CHOICES: { choice: Choice; label: string }[] = [
  { choice: 'locate', label: 'Locate country on globe' },
  { choice: 'name', label: 'Name country from globe' },
  { choice: 'flag', label: 'Flag' },
  { choice: 'area', label: 'Area' },
  { choice: 'population', label: 'Population' },
  { choice: 'ihdi', label: 'IHDI' },
  { choice: 'capital', label: 'Capital' },
  { choice: 'borders', label: 'Borders' },
]

type CustomPracticeMenuProps = {
  // The question types chosen in Settings; only these are offered (both globe
  // options if 'globe' is one of them), plus Borders, which is always offered.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
  // Called with the ticked question types (in the order of QUESTION_IDS, with
  // 'globe' if either globe option is ticked) and which kinds of globe
  // question were ticked (in the order of GLOBE_KINDS), and whether Borders was.
  onGo: (questionIds: QuestionId[], globeKinds: GlobeKind[], asksBorders: boolean) => void
}

// Lets the user tick which questions to practise. "Go" needs at least one.
export function CustomPracticeMenu({ learnedQuestionIds, onBack, onGo }: CustomPracticeMenuProps) {
  const [chosen, setChosen] = useState<Choice[]>([])
  const offered = CHOICES.filter(({ choice }) => {
    if (choice === 'borders') return true
    return learnedQuestionIds.includes(choice === 'locate' || choice === 'name' ? 'globe' : choice)
  })

  function toggle(choice: Choice) {
    setChosen(
      chosen.includes(choice) ? chosen.filter((other) => other !== choice) : [...chosen, choice],
    )
  }

  function go() {
    const globeKinds = GLOBE_KINDS.filter((kind) => chosen.includes(kind))
    const questionIds = QUESTION_IDS.filter((id) =>
      id === 'globe' ? globeKinds.length > 0 : chosen.includes(id),
    )
    onGo(questionIds, globeKinds, chosen.includes('borders'))
  }

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1 className="custom-practice__title">Select which question types to see today</h1>
      <fieldset className="custom-practice__choices">
        {offered.map(({ choice, label }) => (
          <label key={choice} className="custom-practice__choice">
            {label}
            <input
              type="checkbox"
              checked={chosen.includes(choice)}
              onChange={() => toggle(choice)}
            />
          </label>
        ))}
      </fieldset>
      <button
        className="main-menu__option main-menu__option--centered arrow-button"
        onClick={go}
        disabled={chosen.length === 0}
      >
        Go
      </button>
    </main>
  )
}
