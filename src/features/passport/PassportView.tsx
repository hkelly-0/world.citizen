import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadDiscoveries } from '../../shared/discoveries'
import { loadPassportSort, savePassportSort, type PassportSort } from '../../shared/passportSort'
import { loadProgress } from '../../shared/progress'
import { todayString } from '../flashcards/dates'
import type { QuestionId } from '../flashcards/deck'
import { CountryInfoPanel } from '../globe/CountryInfoPanel'
import { RecallCircle } from './RecallCircle'
import {
  countryRecall,
  COUNTRY_COUNT,
  isTooUnfamiliarForNewCountry,
  NEW_COUNTRY_WARNING,
  randomUnseenCountry,
  sortedCollectedCountries,
} from './passport'
import './PassportView.css'

// Pictures made by scripts/make-country-images.mjs.
const COUNTRY_IMAGES = '/country-images'

type PassportViewProps = {
  // The information chosen in Settings; only these questions count towards recall.
  learnedQuestionIds: QuestionId[]
  onBack: () => void
  // Opens the full flashcard for the country with this ISO alpha-3 code.
  onPlayFlashcard: (isoAlpha3: string) => void
}

// Every country the user has seen as a flashcard, as a grid of pictures with
// their names and a ring showing how likely the user is to remember each in 30 days,
// sorted alphabetically, by date discovered or by recall chance (the last choice is
// remembered). It grows as they study. A "New country" card always comes last
// (until all 195 are collected) and plays a random unseen country's flashcard;
// it warns first if the countries already seen aren't familiar enough yet.
export function PassportView({ learnedQuestionIds, onBack, onPlayFlashcard }: PassportViewProps) {
  const [sort, setSort] = useState<PassportSort>(loadPassportSort)
  // The country whose enlarged card is open, if any.
  const [openCode, setOpenCode] = useState<string | null>(null)
  // Whether the enlarged "New country" card is open.
  const [newCountryOpen, setNewCountryOpen] = useState(false)
  const progress = loadProgress()
  const today = todayString()
  const countries = sortedCollectedCountries(
    progress,
    loadDiscoveries(),
    learnedQuestionIds,
    sort,
    today,
  )

  const openCountry = countries.find((country) => country.isoAlpha3 === openCode)
  const hasUnseenCountries = countries.length < COUNTRY_COUNT
  // The same check as before a new country in the flashcards, for the
  // questions chosen in Settings.
  const warnBeforeNewCountry = isTooUnfamiliarForNewCountry(progress, learnedQuestionIds, today)

  // The "New country" card, after every country in the grid whatever the sort.
  const newCountryItem = hasUnseenCountries && (
    <li>
      <button className="passport__country" onClick={() => setNewCountryOpen(true)}>
        <PlusSymbol />
        <span className="passport__name">New country</span>
      </button>
    </li>
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
        <>
          <p className="passport__empty">
            No countries yet. Countries join your Passport once you've seen them in Flashcards.
          </p>
          <ul className="passport__grid">{newCountryItem}</ul>
        </>
      ) : (
        <>
          <label className="passport__sort">
            Sort by
            <select value={sort} onChange={(event) => changeSort(event.target.value as PassportSort)}>
              <option value="alphabetical">Alphabetical</option>
              <option value="date-discovered">Date discovered</option>
              <option value="recall">Familiarity</option>
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
                    <RecallCircle
                      recall={countryRecall(progress[country.isoAlpha3], learnedQuestionIds, today)}
                    />
                  </span>
                </button>
              </li>
            ))}
            {newCountryItem}
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
              // No question types, so only the names are shown, not the facts.
              learnedQuestionIds={[]}
              onClose={() => setOpenCode(null)}
            />
            <button
              className="passport__play"
              onClick={() => onPlayFlashcard(openCountry.isoAlpha3)}
            >
              Play flashcard →
            </button>
          </div>
        </div>
      )}
      {newCountryOpen && (
        // Clicking the dark background closes the enlarged card.
        <div className="passport__overlay" onClick={() => setNewCountryOpen(false)}>
          <div className="passport__enlarged" onClick={(event) => event.stopPropagation()}>
            <PlusSymbol />
            {/* Styled like the info panel shown for a country (its CSS is
                loaded by CountryInfoPanel above). The country is picked only
                when Play is pressed, so nothing here gives it away. */}
            <aside className="country-info-panel" aria-label="New country details">
              <button
                className="country-info-panel__close"
                onClick={() => setNewCountryOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h2>New country</h2>
              <p className="country-info-panel__note">
                {warnBeforeNewCountry ? NEW_COUNTRY_WARNING : "Discover a country you haven't seen yet."}
              </p>
            </aside>
            <button
              className={warnBeforeNewCountry ? 'passport__play passport__play--warning' : 'passport__play'}
              onClick={() => {
                // Only shown while some country is unseen, so `!` is safe here.
                onPlayFlashcard(randomUnseenCountry(progress)!)
              }}
            >
              {warnBeforeNewCountry ? 'Go anyway' : 'Play flashcard →'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

// The "New country" card's picture: a large plus, the same size as a country's.
function PlusSymbol() {
  return (
    <svg className="passport__image passport__plus" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 20 V80 M20 50 H80" />
    </svg>
  )
}
