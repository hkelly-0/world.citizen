import { Fragment, useState, type FormEvent, type KeyboardEvent } from 'react'
import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { flagImageSrc } from '../../shared/flags'
import type { CountryIcon } from '../../shared/settings'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import {
  BORDER_ANSWER_BOXES,
  borderingCountries,
  borderBoxResults,
  markBorderAnswers,
  nextRoundBoxCount,
  nextRoundPrompt,
  remainingBorders,
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
// it is over. It has no FSRS progress.
export function BordersCard({ code, countryIcon, onFinish }: BordersCardProps) {
  const country = countryFacts[code]
  const borderCodes = borderingCountries(code)
  // Each round's typed boxes; the last is the round being answered.
  const [rounds, setRounds] = useState<string[][]>(() => [Array(BORDER_ANSWER_BOXES).fill('')])
  const [isRevealed, setIsRevealed] = useState(false)

  // Reveals the current round: either the question is over, or another round
  // of boxes is added (`nextRoundBoxCount`).
  function reveal(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    const current = rounds[rounds.length - 1]
    const remaining = remainingBorders(rounds.slice(0, -1), borderCodes)
    const boxCount = nextRoundBoxCount(current, remaining)
    if (boxCount === 0) setIsRevealed(true)
    else setRounds([...rounds, Array(boxCount).fill('')])
  }

  function changeCurrentRound(typed: string[]) {
    setRounds([...rounds.slice(0, -1), typed])
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
          borderCodes={borderCodes}
          rounds={rounds}
          onCurrentRoundChange={changeCurrentRound}
          onSubmit={reveal}
          isAnswered={isRevealed}
        />
      </div>

      {/* Until it is over, an empty space keeps Next's spot so the question
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
  // Each round's typed boxes; the last is the round being answered.
  rounds: string[][]
  onCurrentRoundChange: (typed: string[]) => void
  onSubmit: (event: FormEvent) => void
  // Whether the question is over.
  isAnswered: boolean
}

// What a box left blank shows once the borders question is revealed.
const BLANK_BORDER_BOX_TEXT = 'x'

// Text boxes for naming countries that border this one, in rounds: four at
// first, which may be left blank, as is right for a country with fewer than
// four neighbours. Enter moves to the next box, and in a round's last box
// reveals that round. On reveal each box turns green or red as
// `borderBoxResults` marks it, and a blank box shows `BLANK_BORDER_BOX_TEXT`.
// If every box was right and neighbours are left, a new round's boxes are
// added below, after `nextRoundPrompt`. Otherwise every bordering country is
// listed below: those named first, in green and in the order typed, then the
// rest in `borderCodes` order.
function BordersQuestion({
  country,
  borderCodes,
  rounds,
  onCurrentRoundChange,
  onSubmit,
  isAnswered,
}: BordersQuestionProps) {
  const currentRoundIndex = rounds.length - 1
  // For each round: the neighbours left to name, and what its boxes named.
  const remainingByRound = rounds.map((_, index) =>
    remainingBorders(rounds.slice(0, index), borderCodes),
  )
  const namedCodes = rounds
    .flatMap((round, index) => markBorderAnswers(round, remainingByRound[index]))
    .filter((code) => code !== null)
  const unnamedCodes = borderCodes.filter((code) => !namedCodes.includes(code))
  // The boxes are numbered on through the rounds, and so are their ids.
  const firstBoxNumbers = rounds.map((_, index) =>
    rounds.slice(0, index).reduce((count, round) => count + round.length, 0),
  )
  const currentRound = rounds[currentRoundIndex]
  const currentFirstBox = firstBoxNumbers[currentRoundIndex]

  function changeBox(index: number, typed: string) {
    onCurrentRoundChange(currentRound.map((other, i) => (i === index ? typed : other)))
  }

  // Enter in any box but the round's last moves to the next one instead of submitting.
  function moveToNextBox(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Enter' || index === currentRound.length - 1) return
    event.preventDefault()
    document.getElementById(`border-answer-${currentFirstBox + index + 1}`)?.focus()
  }

  return (
    <form className="flashcard__borders-form" onSubmit={onSubmit}>
      <p className="flashcard__question">
        Name up to {BORDER_ANSWER_BOXES} countries which border {country.commonName}
      </p>
      {rounds.map((round, roundIndex) => {
        const isBeingAnswered = roundIndex === currentRoundIndex && !isAnswered
        const boxResults = borderBoxResults(round, remainingByRound[roundIndex])
        return (
          <Fragment key={roundIndex}>
            {roundIndex > 0 && (
              <p className="flashcard__question">
                {nextRoundPrompt(remainingByRound[roundIndex].length)}
              </p>
            )}
            {round.map((typed, index) => {
              const boxNumber = firstBoxNumbers[roundIndex] + index
              const label = `Bordering country ${boxNumber + 1}`
              if (isBeingAnswered) {
                return (
                  <input
                    key={index}
                    id={`border-answer-${boxNumber}`}
                    className="typed-answer__box"
                    value={typed}
                    onChange={(event) => changeBox(index, event.target.value)}
                    onKeyDown={(event) => moveToNextBox(event, index)}
                    aria-label={label}
                    autoComplete="off"
                    autoFocus={index === 0}
                    // Labels the phone keyboard's Enter key to match.
                    enterKeyHint={index === round.length - 1 ? 'done' : 'next'}
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
          </Fragment>
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
