import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import {
  loadCustomPracticeChoices,
  saveCustomPracticeChoices,
} from '../../shared/customPracticeChoices'
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
// The multi-country questions (Borders, Matching and Ordering) aren't question
// types: they have no FSRS progress and aren't in Settings.
type Choice = GlobeKind | Exclude<QuestionId, 'globe'> | MultiCountryQuestionId
const CHOICES: { choice: Choice; label: string }[] = [
  { choice: 'locate', label: 'Locate country on globe' },
  { choice: 'name', label: 'Name country from globe' },
  { choice: 'flag', label: 'Flag' },
  { choice: 'area', label: 'Area' },
  { choice: 'population', label: 'Population' },
  { choice: 'ihdi', label: 'IHDI' },
  { choice: 'capital', label: 'Capital' },
  { choice: 'history', label: 'History' },
  { choice: 'people', label: 'People' },
  { choice: 'economy', label: 'Economy' },
  { choice: 'internationalRelations', label: 'Int. Relations' },
  { choice: 'borders', label: 'Borders' },
  { choice: 'flag-matching', label: 'Matching - Flags' },
  { choice: 'capital-matching', label: 'Matching - Capitals' },
  { choice: 'population-ordering', label: 'Ordering - Population' },
  { choice: 'area-ordering', label: 'Ordering - Area' },
  { choice: 'ihdi-ordering', label: 'Ordering - IHDI' },
]

// The choices are shown in two sections: the questions on one country's card,
// then the multi-country questions (with Borders, though it is about one
// country).
const SECTIONS = [
  { heading: 'Country Fundamentals', isMultiCountrySection: false },
  { heading: 'Multi-Country Questions', isMultiCountrySection: true },
]

function isMultiCountry(choice: Choice): choice is MultiCountryQuestionId {
  return (MULTI_COUNTRY_QUESTION_IDS as readonly Choice[]).includes(choice)
}

type CustomPracticeMenuProps = {
  // The question types chosen in Settings; only these are offered (both globe
  // options if 'globe' is one of them), plus Borders, which is always offered,
  // and each other multi-country question whose LEARNED_QUESTION_NEEDED is one
  // of them.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
  // Called with the ticked question types (in the order of QUESTION_IDS, with
  // 'globe' if either globe option is ticked) and which kinds of globe
  // question were ticked (in the order of GLOBE_KINDS), and which multi-country
  // questions were (in the order of MULTI_COUNTRY_QUESTION_IDS; if any were,
  // nothing else was).
  onGo: (
    questionIds: QuestionId[],
    globeKinds: GlobeKind[],
    multiCountryQuestionIds: MultiCountryQuestionId[],
  ) => void
}

// Lets the user tick which questions to practise. "Go" needs at least one.
// The multi-country questions are practised apart from the rest: while any of
// them is ticked the other boxes are disabled, and the other way round. Opens
// with the boxes ticked when "Go" was last pressed, leaving out any no longer
// offered (e.g. a question type unticked in Settings since), and any
// multi-country ones ticked alongside the others (possible when saved before
// Borders became a multi-country question).
export function CustomPracticeMenu({ learnedQuestionIds, onBack, onGo }: CustomPracticeMenuProps) {
  const offered = CHOICES.filter(({ choice }) => {
    if (choice === 'borders') return true
    if (isMultiCountry(choice)) return learnedQuestionIds.includes(LEARNED_QUESTION_NEEDED[choice])
    return learnedQuestionIds.includes(choice === 'locate' || choice === 'name' ? 'globe' : choice)
  })
  const [chosen, setChosen] = useState<Choice[]>(() => {
    const saved = loadCustomPracticeChoices()
    const savedOffered = offered
      .map(({ choice }) => choice)
      .filter((choice) => saved.includes(choice))
    const isMixed =
      savedOffered.some(isMultiCountry) && savedOffered.some((choice) => !isMultiCountry(choice))
    return isMixed ? savedOffered.filter((choice) => !isMultiCountry(choice)) : savedOffered
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
    saveCustomPracticeChoices(chosen)
    onGo(questionIds, globeKinds, multiCountryQuestionIds)
  }

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1 className="custom-practice__title">Select which question types to see today</h1>
      {SECTIONS.map(({ heading, isMultiCountrySection }) => {
        const sectionChoices = offered.filter(
          ({ choice }) => isMultiCountry(choice) === isMultiCountrySection,
        )
        // A section with nothing offered (nothing it needs is learned) is left out.
        if (sectionChoices.length === 0) return null
        return (
          <fieldset key={heading} className="custom-practice__choices">
            <legend className="custom-practice__heading">{heading}</legend>
            {sectionChoices.map(({ choice, label }) => (
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
        )
      })}
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
