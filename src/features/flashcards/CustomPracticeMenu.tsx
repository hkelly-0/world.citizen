import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import {
  loadCustomPracticeChoices,
  saveCustomPracticeChoices,
} from '../../shared/customPracticeChoices'
import { GLOBE_KINDS, QUESTION_IDS, type GlobeKind, type QuestionId } from './deck'
import {
  canMakeMultiCountryQuestion,
  MULTI_COUNTRY_QUESTION_IDS,
  offeredMultiCountryQuestionIds,
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
  // The Passport's countries (ISO alpha-3 codes). A multi-country question
  // they can't make is disabled.
  passportCodes: string[]
  onBack: () => void
  // Called with the ticked question types (in the order of QUESTION_IDS, with
  // 'globe' if either globe option is ticked) and which kinds of globe
  // question were ticked (in the order of GLOBE_KINDS), and which multi-country
  // questions were (in the order of MULTI_COUNTRY_QUESTION_IDS).
  onGo: (
    questionIds: QuestionId[],
    globeKinds: GlobeKind[],
    multiCountryQuestionIds: MultiCountryQuestionId[],
  ) => void
}

// Lets the user tick which questions to practise. "Go" needs at least one.
// The multi-country questions can be ticked alongside the rest, and are then
// mixed in between the country cards. Opens with the boxes ticked when "Go"
// was last pressed, leaving out any no longer offered (e.g. a question type
// unticked in Settings since). A multi-country question the
// Passport can't make yet is disabled and opens unticked, with one note under
// the section's heading.
export function CustomPracticeMenu({
  learnedQuestionIds,
  passportCodes,
  onBack,
  onGo,
}: CustomPracticeMenuProps) {
  const offered = CHOICES.filter(({ choice }) => {
    if (isMultiCountry(choice)) {
      return offeredMultiCountryQuestionIds(learnedQuestionIds).includes(choice)
    }
    return learnedQuestionIds.includes(choice === 'locate' || choice === 'name' ? 'globe' : choice)
  })
  // Worked out once: the Passport doesn't change while the menu is open.
  const [notEnoughCountries] = useState(() =>
    MULTI_COUNTRY_QUESTION_IDS.filter((id) => !canMakeMultiCountryQuestion(id, passportCodes)),
  )
  function hasNotEnoughCountries(choice: Choice): boolean {
    return isMultiCountry(choice) && notEnoughCountries.includes(choice)
  }
  const [chosen, setChosen] = useState<Choice[]>(() => {
    const saved = loadCustomPracticeChoices()
    return offered
      .map(({ choice }) => choice)
      .filter((choice) => saved.includes(choice) && !hasNotEnoughCountries(choice))
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
        const isMissingCountries = sectionChoices.some(({ choice }) =>
          hasNotEnoughCountries(choice),
        )
        return (
          <fieldset key={heading} className="custom-practice__choices">
            <legend className="custom-practice__heading">{heading}</legend>
            {isMissingCountries && (
              <p className="custom-practice__note">
                Some options require more countries in your Passport
              </p>
            )}
            {sectionChoices.map(({ choice, label }) => (
              <label key={choice} className="custom-practice__choice">
                {label}
                <input
                  type="checkbox"
                  checked={chosen.includes(choice)}
                  disabled={hasNotEnoughCountries(choice)}
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
