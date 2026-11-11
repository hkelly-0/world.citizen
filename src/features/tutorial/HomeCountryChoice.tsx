import { useState } from 'react'
import { compareNames, countryFacts } from '../../shared/countryFacts'
import { matchesCountrySearch } from '../globe/countryNameSearch'
// Laid out like a flashcard, with its text box for the search.
import '../flashcards/FlashcardsView.css'
import '../flashcards/Flashcard.css'
import '../flashcards/TypedAnswerReveal.css'
import '../settings/PassportEditor.css'
import './HomeCountryChoice.css'

// All 197 countries, A–Z by name.
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
    <main className="flashcards-view home-country-choice">
      <article className="flashcard home-country-choice__card">
        <h2>Where are you from?</h2>
        <p className="flashcard__question">
          Choose your home country. We'll use it as the example country for this tutorial.
        </p>
        <input
          className="typed-answer__box home-country-choice__search"
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
        {/* The list's box is left out when it would be empty. */}
        {shownCountries.length > 0 ? (
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
        ) : (
          <p className="passport-editor__empty">No countries found</p>
        )}
      </article>
    </main>
  )
}
