import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { compareNames, countryFacts } from '../../shared/countryFacts'
import { loadProgress } from '../../shared/progress'
import { todayString } from '../flashcards/dates'
import type { QuestionId } from '../flashcards/deck'
import { matchesCountrySearch } from '../globe/countryNameSearch'
import { COUNTRY_COUNT } from '../passport/passport'
import { ConfirmMessage } from './ConfirmMessage'
import { passportCodes, savePassport } from './passportEdit'
// The main menu's layout and buttons.
import '../menu/MainMenu.css'
import './PassportEditor.css'

// All 195 countries, A–Z by name.
const COUNTRIES_BY_NAME = Object.values(countryFacts).sort((a, b) =>
  compareNames(a.commonName, b.commonName),
)

type PassportEditorProps = {
  // The question types learned, which countries added here are given as
  // answered right once (`editedProgress`).
  learnedQuestionIds: QuestionId[]
  onBack: () => void
}

// Opened from Settings: a searchable checklist of every country, ticked if in
// the Passport. Nothing changes until "Save" is pressed; if that removes any
// countries, which deletes their progress, the user is asked first. Once
// saved (or before anything is changed) the button reads "Saved" and is
// disabled.
export function PassportEditor({ learnedQuestionIds, onBack }: PassportEditorProps) {
  // The codes in the saved Passport, and those ticked now.
  const [savedCodes, setSavedCodes] = useState<string[]>(() => passportCodes(loadProgress()))
  const [ticked, setTicked] = useState<string[]>(savedCodes)
  const [searchText, setSearchText] = useState('')
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false)

  function toggle(code: string) {
    setTicked(ticked.includes(code) ? ticked.filter((other) => other !== code) : [...ticked, code])
  }

  const removedCount = savedCodes.filter((code) => !ticked.includes(code)).length
  const isSaved =
    ticked.length === savedCodes.length && ticked.every((code) => savedCodes.includes(code))
  const shownCountries = COUNTRIES_BY_NAME.filter((country) =>
    matchesCountrySearch(country, searchText),
  )

  function save() {
    savePassport(ticked, learnedQuestionIds, todayString())
    setSavedCodes(ticked)
    setIsConfirmingRemoval(false)
  }

  return (
    <main className="main-menu passport-editor">
      <BackButton onClick={onBack} label="← Settings" />
      <h1 className="passport-editor__title">
        Edit Passport{' '}
        <span className="passport-editor__count">
          {ticked.length}/{COUNTRY_COUNT}
        </span>
      </h1>
      <input
        className="passport-editor__search"
        type="text"
        aria-label="Search countries"
        placeholder="Search countries"
        // Stops the browser and phone suggesting their own words.
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />
      {/* Scrolls on its own, so the title, search box and Save stay on screen. */}
      <div className="passport-editor__list">
        <fieldset className="passport-editor__choices">
          {shownCountries.map((country) => (
            <label key={country.isoAlpha3} className="passport-editor__choice">
              {country.commonName}
              <input
                type="checkbox"
                checked={ticked.includes(country.isoAlpha3)}
                onChange={() => toggle(country.isoAlpha3)}
              />
            </label>
          ))}
        </fieldset>
        {shownCountries.length === 0 && (
          <p className="passport-editor__empty">No countries found</p>
        )}
      </div>
      <div className="passport-editor__footer">
        {isConfirmingRemoval ? (
          <ConfirmMessage
            message={
              removedCount === 1
                ? 'Remove 1 country and delete its progress?'
                : `Remove ${removedCount} countries and delete their progress?`
            }
            confirmLabel="Remove"
            onConfirm={save}
            onCancel={() => setIsConfirmingRemoval(false)}
          />
        ) : (
          <button
            // "Saved" has nothing to go on to, so no arrow.
            className={
              isSaved
                ? 'main-menu__option main-menu__option--centered'
                : 'main-menu__option main-menu__option--centered arrow-button'
            }
            onClick={() => (removedCount > 0 ? setIsConfirmingRemoval(true) : save())}
            disabled={isSaved}
          >
            {isSaved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
    </main>
  )
}
