import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadDiscoveries } from '../../shared/discoveries'
import { loadPassportSort, savePassportSort, type PassportSort } from '../../shared/passportSort'
import { loadProgress } from '../../shared/progress'
import type { QuestionId } from '../flashcards/deck'
import { COUNTRY_COUNT, sortedCollectedCountries } from './passport'
import './PassportView.css'

// Pictures made by scripts/make-country-images.mjs.
const COUNTRY_IMAGES = '/country-images'

type PassportViewProps = {
  // The information chosen in Settings; only these questions count towards ease.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
}

// Every country the user has seen as a flashcard, as a grid of pictures with
// their names, sorted alphabetically, by date discovered or by ease (the last
// choice is remembered). It grows as they study.
export function PassportView({ learnedQuestionIds, onBack }: PassportViewProps) {
  const [sort, setSort] = useState<PassportSort>(loadPassportSort)
  const countries = sortedCollectedCountries(
    loadProgress(),
    loadDiscoveries(),
    learnedQuestionIds,
    sort,
  )

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
              <option value="ease">Ease</option>
            </select>
          </label>
          <ul className="passport__grid">
            {countries.map((country) => (
              <li key={country.isoAlpha3} className="passport__country">
                <img
                  className="passport__image"
                  src={`${COUNTRY_IMAGES}/${country.isoAlpha3}.webp`}
                  alt={`Map of ${country.commonName}`}
                />
                <span>{country.commonName}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
