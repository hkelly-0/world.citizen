import { lazy, Suspense, useState, type FormEvent } from 'react'
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
  // The user's tap on the globe, or null until they've answered it.
  const [located, setLocated] = useState<{ pickedName: string; isCorrect: boolean } | null>(null)
  // 0–2 are the range questions; 3 is the capital.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [typedCapital, setTypedCapital] = useState('')

  const isCapitalStep = step === questions.length

  function submitLocation(pickedName: string, isCorrect: boolean) {
    setLocated({ pickedName, isCorrect })
    if (isCorrect) setCorrectCount((count) => count + 1)
  }

  function submitAnswer(chosen: string, isCorrect: boolean) {
    setAnswer(chosen)
    if (isCorrect) setCorrectCount((count) => count + 1)
  }

  function submitCapital(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    if (typedCapital.trim() === '') return
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
      {/* Covers the screen until the user taps a country, then fades away. */}
      {hasLocationQuestion && located === null && (
        <Suspense fallback={<p className="loading">Loading globe…</p>}>
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
      {located !== null && step === 0 && <LocationResult country={country} located={located} />}

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
      {isAnswered && (
        <Result isCorrect={answer === question.correctAnswer} correctAnswer={question.correctAnswer} />
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
        <input
          id="capital-answer"
          className="flashcard__capital-input"
          value={typedCapital}
          onChange={(event) => onTypedCapitalChange(event.target.value)}
          disabled={isAnswered}
          autoComplete="off"
          autoFocus
        />
        {!isAnswered && <button className="flashcard__check">Check</button>}
      </form>
      {isAnswered && (
        <Result
          isCorrect={isCapitalCorrect(answer, country.capitals)}
          correctAnswer={country.capitals.join(', ')}
        />
      )}
    </>
  )
}

function LocationResult({
  country,
  located,
}: {
  country: CountryFacts
  located: { pickedName: string; isCorrect: boolean }
}) {
  return located.isCorrect ? (
    <p className="flashcard__result flashcard__result--correct flashcard__location-result">
      Correct! {country.commonName}
    </p>
  ) : (
    <p className="flashcard__result flashcard__result--wrong flashcard__location-result">
      Wrong — you picked {located.pickedName}
    </p>
  )
}

function Result({ isCorrect, correctAnswer }: { isCorrect: boolean; correctAnswer: string }) {
  return isCorrect ? (
    <p className="flashcard__result flashcard__result--correct">Correct! {correctAnswer}</p>
  ) : (
    <p className="flashcard__result flashcard__result--wrong">Wrong — it's {correctAnswer}</p>
  )
}
