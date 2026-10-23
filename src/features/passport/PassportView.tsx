import { BackButton } from '../../shared/BackButton'
import { loadProgress } from '../../shared/progress'
import { collectedCountries, COUNTRY_COUNT } from './passport'
import './PassportView.css'

// Pictures made by scripts/make-country-images.mjs.
const COUNTRY_IMAGES = '/country-images'

// Every country the user has seen as a flashcard, as a grid of pictures with
// their names, in alphabetical order. It grows as they study.
export function PassportView({ onBack }: { onBack: () => void }) {
  const countries = collectedCountries(loadProgress())

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
      )}
    </main>
  )
}
