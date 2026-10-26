import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { GLOBE_KINDS, QUESTION_IDS, type GlobeKind, type QuestionId } from './deck'
import {
  LEARNED_QUESTION_NEEDED,
  MULTI_COUNTRY_QUESTION_IDS,
  type MultiCountryQuestionId,
} from './multiCountryQuestions'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'
import './CustomPracticeMenu.css'

// One checkbox each. The two globe options are both the 'globe' question type.
// Borders and the multi-country questions (Matching and Ranking)
// aren't question types: they have no FSRS progress and aren't in Settings.
type Choice = GlobeKind | Exclude<QuestionId, 'globe'> | 'borders' | MultiCountryQuestionId
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
  { choice: 'capital-matching', label: 'Capital Matching' },
  { choice: 'population-ranking', label: 'Ranking - Population' },
  { choice: 'area-ranking', label: 'Ranking - Area' },
  { choice: 'ihdi-ranking', label: 'Ranking - IHDI' },
]

function isMultiCountry(choice: Choice): choice is MultiCountryQuestionId {
  return (MULTI_COUNTRY_QUESTION_IDS as readonly Choice[]).includes(choice)
}

type CustomPracticeMenuProps = {
  // The question types chosen in Settings; only these are offered (both globe
  // options if 'globe' is one of them), plus Borders, which is always offered,
  // and each multi-country question whose LEARNED_QUESTION_NEEDED is one of them.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
  // Called with the ticked question types (in the order of QUESTION_IDS, with
  // 'globe' if either globe option is ticked) and which kinds of globe
  // question were ticked (in the order of GLOBE_KINDS), whether Borders was,
  // and which multi-country questions were (in the order of
  // MULTI_COUNTRY_QUESTION_IDS; if any were, nothing else was).
  onGo: (
    questionIds: QuestionId[],
    globeKinds: GlobeKind[],
    asksBorders: boolean,
    multiCountryQuestionIds: MultiCountryQuestionId[],
  ) => void
}

// Lets the user tick which questions to practise. "Go" needs at least one.
// The multi-country questions are practised apart from the rest: while any of
// them is ticked the other boxes are disabled, and the other way round.
export function CustomPracticeMenu({ learnedQuestionIds, onBack, onGo }: CustomPracticeMenuProps) {
  const [chosen, setChosen] = useState<Choice[]>([])
  const offered = CHOICES.filter(({ choice }) => {
    if (choice === 'borders') return true
    if (isMultiCountry(choice)) return learnedQuestionIds.includes(LEARNED_QUESTION_NEEDED[choice])
    return learnedQuestionIds.includes(choice === 'locate' || choice === 'name' ? 'globe' : choice)
  })

  const isMultiCountryChosen = chosen.some(isMultiCountry)
  function isDisabled(choice: Choice): boolean {
    if (chosen.length === 0) return false
    return isMultiCountry(choice) !== isMultiCountryChosen
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
    const multiCountryQuestionIds = MULTI_COUNTRY_QUESTION_IDS.filter((id) => chosen.includes(id))
    onGo(questionIds, globeKinds, chosen.includes('borders'), multiCountryQuestionIds)
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
