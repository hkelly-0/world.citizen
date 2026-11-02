import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import {
  loadCustomPracticeChoices,
  saveCustomPracticeChoices,
} from '../../shared/customPracticeChoices'
import {
  GLOBE_KINDS,
  INFO_QUESTION_IDS,
  QUESTION_IDS,
  type GlobeKind,
  type QuestionId,
} from './deck'
import {
  canMakeMultiCountryQuestion,
  MULTI_COUNTRY_QUESTION_IDS,
  offeredMultiCountryQuestionIds,
  type MultiCountryQuestionId,
} from './multiCountryQuestions'
// Same layout as the main menu, and the same cards and switches as Settings.
import '../menu/MainMenu.css'
import '../settings/SettingsMenu.css'
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

// The choices are shown in two cards: the questions on one country's card,
// split into Fundamentals and Textual info as in Settings, then the
// multi-country questions (with Borders, though it is about one country).
function isTextualInfo(choice: Choice): boolean {
  return (INFO_QUESTION_IDS as Choice[]).includes(choice)
}

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
// the card's label.
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

  // One switch row per choice in the list given.
  function choiceRows(choices: typeof offered) {
    return choices.map(({ choice, label }) => (
      <label
        key={choice}
        className={
          hasNotEnoughCountries(choice)
            ? 'settings__row settings__switch-row custom-practice__unavailable'
            : 'settings__row settings__switch-row'
        }
      >
        {label}
        <input
          type="checkbox"
          className="settings__switch-input"
          checked={chosen.includes(choice)}
          disabled={hasNotEnoughCountries(choice)}
          onChange={() => toggle(choice)}
        />
        {/* The visible switch, drawn from the hidden checkbox's state. */}
        <span className="settings__switch" aria-hidden="true" />
      </label>
    ))
  }

  const fundamentals = offered.filter(
    ({ choice }) => !isMultiCountry(choice) && !isTextualInfo(choice),
  )
  const textualInfo = offered.filter(({ choice }) => isTextualInfo(choice))
  const multiCountry = offered.filter(({ choice }) => isMultiCountry(choice))
  const isMissingCountries = multiCountry.some(({ choice }) => hasNotEnoughCountries(choice))

  return (
    <main className="main-menu settings">
      <BackButton onClick={onBack} />
      <h1 className="settings__title">Custom Practice</h1>
      <section className="settings__section">
        <h2 className="settings__heading">Select which question types to see today</h2>
        {/* A card or group with nothing offered (nothing it needs is learned)
            is left out. */}
        {(fundamentals.length > 0 || textualInfo.length > 0) && (
          <div className="settings__card">
            {fundamentals.length > 0 && (
              <fieldset className="settings__group">
                <legend className="settings__group-label">Fundamentals</legend>
                {choiceRows(fundamentals)}
              </fieldset>
            )}
            {textualInfo.length > 0 && (
              <fieldset className="settings__group">
                <legend className="settings__group-label">Textual info</legend>
                {choiceRows(textualInfo)}
              </fieldset>
            )}
          </div>
        )}
        {multiCountry.length > 0 && (
          <div className="settings__card custom-practice__card">
            <fieldset className="settings__group">
              <legend className="settings__group-label">Multi-Country Questions</legend>
              {isMissingCountries && (
                <p className="custom-practice__note">
                  Some options require more countries in your Passport
                </p>
              )}
              {choiceRows(multiCountry)}
            </fieldset>
          </div>
        )}
      </section>
      <button
        className="custom-practice__go arrow-button"
        onClick={go}
        disabled={chosen.length === 0}
      >
        Go
      </button>
    </main>
  )
}
