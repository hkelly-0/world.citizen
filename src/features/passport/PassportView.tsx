import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadDiscoveries } from '../../shared/discoveries'
import { loadPassportSort, savePassportSort, type PassportSort } from '../../shared/passportSort'
import { loadProgress } from '../../shared/progress'
import type { QuestionId } from '../flashcards/deck'
import { CountryInfoPanel } from '../globe/CountryInfoPanel'
import { EaseCircle } from './EaseCircle'
import { countryEase, COUNTRY_COUNT, sortedCollectedCountries } from './passport'
import './PassportView.css'

// Pictures made by scripts/make-country-images.mjs.
const COUNTRY_IMAGES = '/country-images'

type PassportViewProps = {
  // The information chosen in Settings; only these questions count towards ease.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
}

// Every country the user has seen as a flashcard, as a grid of pictures with
// their names and a ring showing how easy the user finds each, sorted
// alphabetically, by date discovered or by ease (the last choice is
// remembered). It grows as they study.
export function PassportView({ learnedQuestionIds, onBack }: PassportViewProps) {
  const [sort, setSort] = useState<PassportSort>(loadPassportSort)
  // The country whose enlarged card is open, if any.
  const [openCode, setOpenCode] = useState<string | null>(null)
  const progress = loadProgress()
  const countries = sortedCollectedCountries(
    progress,
    loadDiscoveries(),
    learnedQuestionIds,
    sort,
  )

  const openCountry = countries.find((country) => country.isoAlpha3 === openCode)

  function changeSort(next: PassportSort) {
    setSort(next)
    savePassportSort(next)
  }

  return (
    <main className="passport">
      <BackButton onClick={onBack} />
      <h1>
        Passport{' '}
        <span className="passport__count">
          {countries.length}/{COUNTRY_COUNT}
        </span>
      </h1>
      {countries.length === 0 ? (
        <p className="passport__empty">
          No countries yet. Countries join your Passport once you've seen them in Flashcards.
        </p>
      ) : (
        <>
          <label className="passport__sort">
            Sort by
            <select value={sort} onChange={(event) => changeSort(event.target.value as PassportSort)}>
              <option value="alphabetical">Alphabetical</option>
              <option value="date-discovered">Date discovered</option>
              <option value="ease">Familiarity</option>
            </select>
          </label>
          <ul className="passport__grid">
            {countries.map((country) => (
              <li key={country.isoAlpha3}>
                <button
                  className="passport__country"
                  onClick={() => setOpenCode(country.isoAlpha3)}
                >
                  <img
                    className="passport__image"
                    src={`${COUNTRY_IMAGES}/${country.isoAlpha3}.webp`}
                    alt={`Map of ${country.commonName}`}
                  />
                  <span className="passport__name">
                    {country.commonName}
                    <EaseCircle
                      ease={countryEase(progress[country.isoAlpha3], learnedQuestionIds)}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {openCountry !== undefined && (
        // Clicking the dark background closes the enlarged card.
        <div className="passport__overlay" onClick={() => setOpenCode(null)}>
          <div className="passport__enlarged" onClick={(event) => event.stopPropagation()}>
            <img
              className="passport__image"
              src={`${COUNTRY_IMAGES}/${openCountry.isoAlpha3}.webp`}
              alt={`Map of ${openCountry.commonName}`}
            />
            <CountryInfoPanel
              country={{ name: openCountry.commonName, isoAlpha3: openCountry.isoAlpha3 }}
              learnedQuestionIds={learnedQuestionIds}
              onClose={() => setOpenCode(null)}
              onSelectCountry={() => {}}
            />
          </div>
        </div>
      )}
    </main>
  )
}
