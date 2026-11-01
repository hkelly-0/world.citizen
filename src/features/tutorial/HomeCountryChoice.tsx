import { useState } from 'react'
import { compareNames, countryFacts } from '../../shared/countryFacts'
import { matchesCountrySearch } from '../globe/countryNameSearch'
// Same layout, title and search box as the Passport editor.
import '../menu/MainMenu.css'
import '../flashcards/CustomPracticeMenu.css'
import '../settings/PassportEditor.css'
import './HomeCountryChoice.css'

// All 195 countries, A–Z by name.
const COUNTRIES_BY_NAME = Object.values(countryFacts).sort((a, b) =>
  compareNames(a.commonName, b.commonName),
)

type HomeCountryChoiceProps = {
  // Called with the ISO alpha-3 code of the country tapped.
  onChoose: (isoAlpha3: string) => void
}

// The tutorial's second step: a searchable list of every country, filtered
// like the Passport editor's. Tapping one chooses it as the home country.
export function HomeCountryChoice({ onChoose }: HomeCountryChoiceProps) {
  const [searchText, setSearchText] = useState('')
  const shownCountries = COUNTRIES_BY_NAME.filter((country) =>
    matchesCountrySearch(country, searchText),
  )

  return (
    <main className="main-menu passport-editor home-country-choice">
      <h1 className="custom-practice__title">Where are you from?</h1>
      <p className="home-country-choice__intro">
        Choose your home country. Its card comes first, with tips along the way.
      </p>
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
      <ul className="home-country-choice__list">
        {shownCountries.map((country) => (
          <li key={country.isoAlpha3}>
            <button
              className="home-country-choice__country"
              onClick={() => onChoose(country.isoAlpha3)}
            >
              {country.commonName}
            </button>
          </li>
        ))}
      </ul>
      {shownCountries.length === 0 && <p className="passport-editor__empty">No countries found</p>}
    </main>
  )
}
