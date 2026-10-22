import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { isCapitalCorrect } from './capitalAnswer'
import { rangeQuestions, type RangeQuestion } from './rangeQuestions'
import './Flashcard.css'

// The globe (MapLibre + border data) is large, so it is loaded only when a
// card asks the location question. This keeps the other questions fast.
const LocateCountryGlobe = lazy(() => import('../globe/LocateCountryGlobe'))

// Pictures made by scripts/make-country-images.mjs. Tuvalu has none because
// world-atlas has no outline for it, which also means it can't be tapped on
// the globe, so its card skips the location question.
const COUNTRY_IMAGES = '/country-images'
const COUNTRIES_WITHOUT_IMAGE = ['TUV']

type FlashcardProps = {
  country: CountryFacts
  // Called after the last question, with how many were correct out of how many
  // were asked (5, or 4 for a country without a location question).
  onFinish: (correctCount: number, questionCount: number) => void
}

// One country's card: first its location (tapped on the globe), then area,
// population and IHDI (picked from range titles), then the capital (typed).
// Each answer is revealed before moving on.
export function Flashcard({ country, onFinish }: FlashcardProps) {
  const questions = rangeQuestions(country)
  const hasLocationQuestion = !COUNTRIES_WITHOUT_IMAGE.includes(country.isoAlpha3)
  const questionCount = hasLocationQuestion ? 5 : 4
  // Whether the user has tapped a country on the globe yet.
  const [hasLocated, setHasLocated] = useState(false)
  // 0–2 are the range questions; 3 is the capital.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [typedCapital, setTypedCapital] = useState('')

  const isCapitalStep = step === questions.length

  function submitLocation(isCorrect: boolean) {
    setHasLocated(true)
    if (isCorrect) setCorrectCount((count) => count + 1)
  }

  function submitAnswer(chosen: string, isCorrect: boolean) {
    setAnswer(chosen)
    if (isCorrect) setCorrectCount((count) => count + 1)
  }

  function submitCapital(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    submitAnswer(typedCapital, isCapitalCorrect(typedCapital, country.capitals))
  }

  function goToNext() {
    if (isCapitalStep) {
      onFinish(correctCount, questionCount)
    } else {
      setStep(step + 1)
      setAnswer(null)
    }
  }

  return (
    <article className="flashcard" aria-label={`${country.commonName} flashcard`}>
      {/* Covers the screen until the user taps a country, then fades away.
          While the globe's code loads, a plain cover of the same colour hides
          the card so it doesn't flash up first. */}
      {hasLocationQuestion && !hasLocated && (
        <Suspense fallback={<div className="flashcard__globe-loading">Loading globe…</div>}>
          <LocateCountryGlobe
            isoAlpha3={country.isoAlpha3}
            countryName={country.commonName}
            onAnswer={submitLocation}
          />
        </Suspense>
      )}
      {!COUNTRIES_WITHOUT_IMAGE.includes(country.isoAlpha3) && (
        <img
          className="flashcard__image"
          src={`${COUNTRY_IMAGES}/${country.isoAlpha3}.webp`}
          alt={`Map of ${country.commonName}`}
        />
      )}
      <h2>{country.commonName}</h2>

      {isCapitalStep ? (
        <CapitalQuestion
          country={country}
          typedCapital={typedCapital}
          onTypedCapitalChange={setTypedCapital}
          onSubmit={submitCapital}
          answer={answer}
        />
      ) : (
        <RangeQuestionView
          question={questions[step]}
          answer={answer}
          onAnswer={(chosen) =>
            submitAnswer(chosen, chosen === questions[step].correctAnswer)
          }
        />
      )}

      {answer !== null && (
        <button className="flashcard__next" onClick={goToNext} autoFocus>
          Next
        </button>
      )}
    </article>
  )
}

type RangeQuestionViewProps = {
  question: RangeQuestion
  answer: string | null
  onAnswer: (chosen: string) => void
}

function RangeQuestionView({ question, answer, onAnswer }: RangeQuestionViewProps) {
  const isAnswered = answer !== null

  // After answering, the correct option turns green and a wrong pick turns red.
  function optionClassName(option: string): string {
    if (!isAnswered) return 'flashcard__option'
    if (option === question.correctAnswer) return 'flashcard__option flashcard__option--correct'
    if (option === answer) return 'flashcard__option flashcard__option--wrong'
    return 'flashcard__option'
  }

  return (
    <>
      <p className="flashcard__question">{question.label}?</p>
      <div className="flashcard__options">
        {question.options.map((option) => (
          <button
            key={option}
            className={optionClassName(option)}
            onClick={() => onAnswer(option)}
            disabled={isAnswered}
          >
            {option}
          </button>
        ))}
      </div>
      {isAnswered && question.isEstimate && (
        <p className="flashcard__note">Estimated: UNDP has no IHDI for this country.</p>
      )}
    </>
  )
}

type CapitalQuestionProps = {
  country: CountryFacts
  typedCapital: string
  onTypedCapitalChange: (typed: string) => void
  onSubmit: (event: FormEvent) => void
  answer: string | null
}

function CapitalQuestion({
  country,
  typedCapital,
  onTypedCapitalChange,
  onSubmit,
  answer,
}: CapitalQuestionProps) {
  const isAnswered = answer !== null
  const label = country.capitals.length === 1 ? 'Capital' : 'Capital (any one of them)'

  return (
    <>
      <form className="flashcard__capital-form" onSubmit={onSubmit}>
        <label className="flashcard__question" htmlFor="capital-answer">
          {label}?
        </label>
        {isAnswered ? (
          <CapitalReveal
            typed={answer}
            isCorrect={isCapitalCorrect(answer, country.capitals)}
            correctCapitals={country.capitals.join(', ')}
          />
        ) : (
          <input
            id="capital-answer"
            className="flashcard__capital-input"
            value={typedCapital}
            onChange={(event) => onTypedCapitalChange(event.target.value)}
            autoComplete="off"
            autoFocus
          />
        )}
        {!isAnswered && <button className="flashcard__check">Reveal</button>}
      </form>
    </>
  )
}

// How long each letter of the correct capital takes to appear.
const TYPING_MS_PER_LETTER = 40

type CapitalRevealProps = {
  typed: string
  isCorrect: boolean
  // All the capitals, e.g. "Pretoria, Bloemfontein, Cape Town".
  correctCapitals: string
}

// Replaces the text box once the capital is answered. A correct answer fades
// to green with the box highlighted green. A wrong answer fades to red, and
// the correct capital is then typed out in green beside it.
function CapitalReveal({ typed, isCorrect, correctCapitals }: CapitalRevealProps) {
  const [lettersTyped, setLettersTyped] = useState(0)

  useEffect(() => {
    if (isCorrect) return
    const timer = window.setInterval(() => {
      setLettersTyped((count) => {
        if (count + 1 >= correctCapitals.length) window.clearInterval(timer)
        return count + 1
      })
    }, TYPING_MS_PER_LETTER)
    return () => window.clearInterval(timer)
  }, [isCorrect, correctCapitals])

  return (
    <div className={isCorrect ? 'flashcard__capital-input flashcard__capital-input--correct' : 'flashcard__capital-input'}>
      <span className={isCorrect ? 'flashcard__capital-green' : 'flashcard__capital-red'}>{typed}</span>
      {!isCorrect && lettersTyped > 0 && (
        <>
          {typed !== '' && ' '}
          <span className="flashcard__capital-green flashcard__capital-green--typed">
            {correctCapitals.slice(0, lettersTyped)}
          </span>
        </>
      )}
    </div>
  )
}
