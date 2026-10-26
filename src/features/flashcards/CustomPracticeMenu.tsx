import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { GLOBE_KINDS, QUESTION_IDS, type GlobeKind, type QuestionId } from './deck'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'
import './CustomPracticeMenu.css'

// One checkbox each. The two globe options are both the 'globe' question type.
// Borders and Flag Matching aren't question types: they have no FSRS progress
// and aren't in Settings.
type Choice = GlobeKind | Exclude<QuestionId, 'globe'> | 'borders' | 'flag-matching'
const CHOICES: { choice: Choice; label: string }[] = [
  { choice: 'locate', label: 'Locate country on globe' },
  { choice: 'name', label: 'Name country from globe' },
  { choice: 'flag', label: 'Flag' },
  { choice: 'area', label: 'Area' },
  { choice: 'population', label: 'Population' },
  { choice: 'ihdi', label: 'IHDI' },
  { choice: 'capital', label: 'Capital' },
  { choice: 'borders', label: 'Borders' },
  { choice: 'flag-matching', label: 'Flag Matching' },
]

type CustomPracticeMenuProps = {
  // The question types chosen in Settings; only these are offered (both globe
  // options if 'globe' is one of them), plus Borders, which is always offered,
  // and Flag Matching, offered if 'flag' is one of them.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
  // Called with the ticked question types (in the order of QUESTION_IDS, with
  // 'globe' if either globe option is ticked) and which kinds of globe
  // question were ticked (in the order of GLOBE_KINDS), whether Borders was,
  // and whether Flag Matching was (in which case nothing else was).
  onGo: (
    questionIds: QuestionId[],
    globeKinds: GlobeKind[],
    asksBorders: boolean,
    asksFlagMatching: boolean,
  ) => void
}

// Lets the user tick which questions to practise. "Go" needs at least one.
// Flag Matching is practised alone: while it is ticked the other boxes are
// disabled, and while any other is ticked it is.
export function CustomPracticeMenu({ learnedQuestionIds, onBack, onGo }: CustomPracticeMenuProps) {
  const [chosen, setChosen] = useState<Choice[]>([])
  const offered = CHOICES.filter(({ choice }) => {
    if (choice === 'borders') return true
    if (choice === 'flag-matching') return learnedQuestionIds.includes('flag')
    return learnedQuestionIds.includes(choice === 'locate' || choice === 'name' ? 'globe' : choice)
  })

  const isFlagMatchingChosen = chosen.includes('flag-matching')
  function isDisabled(choice: Choice): boolean {
    if (choice === 'flag-matching') return chosen.length > 0 && !isFlagMatchingChosen
    return isFlagMatchingChosen
  }

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
    onGo(questionIds, globeKinds, chosen.includes('borders'), isFlagMatchingChosen)
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
              disabled={isDisabled(choice)}
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
