import { lazy, Suspense, useState, type FormEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { isCapitalCorrect } from './capitalAnswer'
import { rangeQuestions, type RangeQuestion } from './rangeQuestions'
import { TypedAnswerReveal } from './TypedAnswerReveal'
import './Flashcard.css'

// The globe (MapLibre + border data) is large, so it is loaded only when a
// card asks a globe question. This keeps the other questions fast.
const LocateCountryGlobe = lazy(() => import('../globe/LocateCountryGlobe'))
const NameCountryGlobe = lazy(() => import('../globe/NameCountryGlobe'))

// Pictures made by scripts/make-country-images.mjs.
const COUNTRY_IMAGES = '/country-images'

type FlashcardProps = {
  country: CountryFacts
  // Called after the last question, with how many were correct out of 5.
  onFinish: (correctCount: number) => void
}

// One country's card: first a globe question, then area, population and IHDI
// (picked from range titles), then the capital (typed). The globe question is,
// at random half the time each, either finding the country (tapped on the
// globe) or naming the country shown on the globe (typed). Each answer is
// revealed before moving on.
export function Flashcard({ country, onFinish }: FlashcardProps) {
  const questions = rangeQuestions(country)
  // Chosen once, when the card is first shown.
  const [isNameQuestion] = useState(() => Math.random() < 0.5)
  // Whether the user has answered the globe question yet.
  const [hasAnsweredGlobe, setHasAnsweredGlobe] = useState(false)
  // 0–2 are the range questions; 3 is the capital.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [typedCapital, setTypedCapital] = useState('')

  const isCapitalStep = step === questions.length

  function submitGlobeAnswer(isCorrect: boolean) {
    setHasAnsweredGlobe(true)
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
      onFinish(correctCount)
    } else {
      setStep(step + 1)
      setAnswer(null)
    }
  }

  return (
    <article className="flashcard" aria-label={`${country.commonName} flashcard`}>
      {/* Covers the screen until the user answers the globe question, then
          fades away. While the globe's code loads, a plain cover of the same
          colour hides the card so it doesn't flash up first. */}
      {!hasAnsweredGlobe && (
        <Suspense fallback={<div className="flashcard__globe-loading">Loading globe…</div>}>
          {isNameQuestion ? (
            <NameCountryGlobe country={country} onAnswer={submitGlobeAnswer} />
          ) : (
            <LocateCountryGlobe
              isoAlpha3={country.isoAlpha3}
              countryName={country.commonName}
              onAnswer={submitGlobeAnswer}
            />
          )}
        </Suspense>
      )}
      <img
        className="flashcard__image"
        src={`${COUNTRY_IMAGES}/${country.isoAlpha3}.webp`}
        alt={`Map of ${country.commonName}`}
      />
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
          <TypedAnswerReveal
            typed={answer}
            isCorrect={isCapitalCorrect(answer, country.capitals)}
            correctAnswer={country.capitals.join(', ')}
          />
        ) : (
          <input
            id="capital-answer"
            className="typed-answer__box"
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
