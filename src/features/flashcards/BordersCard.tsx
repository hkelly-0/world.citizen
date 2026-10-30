import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { flagImageSrc } from '../../shared/flags'
import type { CountryIcon } from '../../shared/settings'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import {
  BORDER_ANSWER_BOXES,
  borderingCountries,
  borderBoxResults,
  markBorderAnswers,
} from './bordersQuestion'
// The boxes' styles, loaded before Flashcard.css as on the regular card.
import './TypedAnswerReveal.css'
import './Flashcard.css'

// Pictures made by scripts/make-country-images.mjs.
const COUNTRY_IMAGES = '/country-images'

type BordersCardProps = {
  // A country with land neighbours (`bordersQuestionCountry`).
  code: string
  // Whether the picture at the top is the country's outline or its flag, chosen in Settings.
  countryIcon: CountryIcon
  onFinish: () => void
}

// One borders question (Custom Practice only), laid out like a country's
// flashcard: the country's picture and name, then the question, then Next once
// revealed. It has no FSRS progress.
export function BordersCard({ code, countryIcon, onFinish }: BordersCardProps) {
  const country = countryFacts[code]
  const [typedBorders, setTypedBorders] = useState<string[]>(() =>
    Array(BORDER_ANSWER_BOXES).fill(''),
  )
  const [isRevealed, setIsRevealed] = useState(false)

  function reveal(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    setIsRevealed(true)
  }

  // A click anywhere presses Next while it is showing.
  useClickAnywhereToContinue(isRevealed, onFinish)

  return (
    <article className="flashcard" aria-label={`${country.commonName} borders`}>
      {countryIcon === 'outline' ? (
        <img
          className="flashcard__image"
          src={`${COUNTRY_IMAGES}/${code}.webp`}
          alt={`Map of ${country.commonName}`}
        />
      ) : (
        <img
          className="flashcard__image flashcard__flag-image"
          src={flagImageSrc(code)}
          alt={`Flag of ${country.commonName}`}
        />
      )}
      <h2>{country.commonName}</h2>

      {/* Centred in the space between the name and the Next button. */}
      <div className="flashcard__body">
        <BordersQuestion
          country={country}
          borderCodes={borderingCountries(code)}
          typedBorders={typedBorders}
          onTypedBordersChange={setTypedBorders}
          onSubmit={reveal}
          isAnswered={isRevealed}
        />
      </div>

      {/* Until revealed, an empty space keeps Next's spot so the question
          doesn't move when Next appears. */}
      {isRevealed ? (
        <button className="flashcard__next arrow-button" onClick={onFinish} autoFocus>
          Next
        </button>
      ) : (
        <div className="flashcard__next-space" aria-hidden="true" />
      )}
    </article>
  )
}

type BordersQuestionProps = {
  country: CountryFacts
  // The countries bordering `country`, in the order to list them on reveal.
  borderCodes: string[]
  typedBorders: string[]
  onTypedBordersChange: (typed: string[]) => void
  onSubmit: (event: FormEvent) => void
  isAnswered: boolean
}

// What a box left blank shows once the borders question is revealed.
const BLANK_BORDER_BOX_TEXT = 'x'

// Four text boxes for naming countries that border this one; boxes may be left
// blank, which is right for a country with fewer than four neighbours. Enter
// moves to the next box, and in the last box reveals the answers. On reveal
// each box turns green or red as `borderBoxResults` marks it, and a blank box
// shows `BLANK_BORDER_BOX_TEXT`. Every bordering country is listed below: those
// named first, in green and in the order typed, then the rest in `borderCodes`
// order.
function BordersQuestion({
  country,
  borderCodes,
  typedBorders,
  onTypedBordersChange,
  onSubmit,
  isAnswered,
}: BordersQuestionProps) {
  const marks = markBorderAnswers(typedBorders, borderCodes)
  const boxResults = borderBoxResults(typedBorders, borderCodes)
  const namedCodes = marks.filter((code) => code !== null)
  const unnamedCodes = borderCodes.filter((code) => !namedCodes.includes(code))

  function changeBox(index: number, typed: string) {
    onTypedBordersChange(typedBorders.map((other, i) => (i === index ? typed : other)))
  }

  // Enter in any box but the last moves to the next one instead of submitting.
  function moveToNextBox(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Enter' || index === typedBorders.length - 1) return
    event.preventDefault()
    document.getElementById(`border-answer-${index + 1}`)?.focus()
  }

  return (
    <form className="flashcard__borders-form" onSubmit={onSubmit}>
      <p className="flashcard__question">
        Name up to {BORDER_ANSWER_BOXES} countries which border {country.commonName}
      </p>
      {typedBorders.map((typed, index) => {
        const label = `Bordering country ${index + 1}`
        if (!isAnswered) {
          return (
            <input
              key={index}
              id={`border-answer-${index}`}
              className="typed-answer__box"
              value={typed}
              onChange={(event) => changeBox(index, event.target.value)}
              onKeyDown={(event) => moveToNextBox(event, index)}
              aria-label={label}
              autoComplete="off"
              autoFocus={index === 0}
              // Labels the phone keyboard's Enter key to match.
              enterKeyHint={index === typedBorders.length - 1 ? 'done' : 'next'}
            />
          )
        }
        const isCorrect = boxResults[index]
        const answered = 'typed-answer__box typed-answer__box--answered'
        const className = isCorrect
          ? `${answered} typed-answer__box--correct`
          : `${answered} flashcard__border-box--wrong`
        return (
          <div key={index} className={className} aria-label={label}>
            <span className={isCorrect ? 'typed-answer__green' : 'typed-answer__red'}>
              {typed.trim() === '' ? BLANK_BORDER_BOX_TEXT : typed}
            </span>
          </div>
        )
      })}
      {isAnswered ? (
        <ul className="flashcard__borders" aria-label={`Countries bordering ${country.commonName}`}>
          {namedCodes.map((code) => (
            <li key={code} className="flashcard__border flashcard__border--named">
              {countryFacts[code].commonName}
            </li>
          ))}
          {unnamedCodes.map((code) => (
            <li key={code} className="flashcard__border">
              {countryFacts[code].commonName}
            </li>
          ))}
        </ul>
      ) : (
        <button className="flashcard__check">Reveal</button>
      )}
    </form>
  )
}
