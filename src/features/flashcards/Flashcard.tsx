import { lazy, Suspense, useState, type FormEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import { isCapitalCorrect } from './capitalAnswer'
import type { GlobeKind, QuestionId } from './deck'
import { rangeAnswerResult, rangeQuestions, type RangeQuestion } from './rangeQuestions'
import type { AnswerResult } from './fsrs'
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
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // Which kinds of globe question may be asked: both for Classic, where each
  // card picks one at random, or just one for custom practice.
  globeKinds: GlobeKind[]
  // Called after the last question, with how each asked question was answered:
  // right, close (range questions only) or wrong.
  onFinish: (results: Partial<Record<QuestionId, AnswerResult>>) => void
}

// One country's card: first a globe question, then area, population and IHDI
// (picked from range titles), then the capital (typed), skipping any not in
// `questionIds`. The globe question is, at random half the time each, either
// finding the country (tapped on the globe) or naming the country shown on the
// globe (typed). Each answer is revealed before moving on.
export function Flashcard({ country, questionIds, globeKinds, onFinish }: FlashcardProps) {
  const asksGlobe = questionIds.includes('globe')
  const asksCapital = questionIds.includes('capital')
  // With only the globe question, the globe doesn't fade to reveal the card,
  // which would flash up for a moment before the next card's globe.
  const isGlobeOnly = questionIds.length === 1 && asksGlobe
  const questions = rangeQuestions(country).filter((question) => questionIds.includes(question.id))
  // Chosen once, when the card is first shown: at random if both kinds are allowed.
  const [isNameQuestion] = useState(() =>
    globeKinds.length === 1 ? globeKinds[0] === 'name' : Math.random() < 0.5,
  )
  // Whether the user has answered the globe question yet (or it isn't asked).
  const [hasAnsweredGlobe, setHasAnsweredGlobe] = useState(!asksGlobe)
  // Counts through the range questions being asked; the step after them is the capital.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  // How each question answered so far went.
  const [results, setResults] = useState<Partial<Record<QuestionId, AnswerResult>>>({})
  const [typedCapital, setTypedCapital] = useState('')

  const isCapitalStep = step === questions.length
  const isLastStep = asksCapital ? isCapitalStep : step === questions.length - 1

  function submitGlobeAnswer(isCorrect: boolean) {
    const newResults = { ...results, globe: resultFromCorrect(isCorrect) }
    setHasAnsweredGlobe(true)
    setResults(newResults)
    // When only the globe question is asked, the card is finished.
    if (questions.length === 0 && !asksCapital) onFinish(newResults)
  }

  function submitAnswer(id: QuestionId, chosen: string, result: AnswerResult) {
    setAnswer(chosen)
    setResults((previous) => ({ ...previous, [id]: result }))
  }

  function submitCapital(event: FormEvent) {
    // Stop the browser from reloading the page on form submit.
    event.preventDefault()
    submitAnswer(
      'capital',
      typedCapital,
      resultFromCorrect(isCapitalCorrect(typedCapital, country.capitals)),
    )
  }

  function goToNext() {
    if (isLastStep) {
      onFinish(results)
    } else {
      setStep(step + 1)
      setAnswer(null)
    }
  }

  // A click anywhere presses Next while it is showing.
  useClickAnywhereToContinue(answer !== null, goToNext)

  return (
    <article className="flashcard" aria-label={`${country.commonName} flashcard`}>
      {/* Covers the screen until the user answers the globe question, then
          fades away. While the globe's code loads, a plain cover of the same
          colour hides the card so it doesn't flash up first. */}
      {!hasAnsweredGlobe && (
        <Suspense fallback={<div className="flashcard__globe-loading">Loading globe…</div>}>
          {isNameQuestion ? (
            <NameCountryGlobe
              country={country}
              fadesOut={!isGlobeOnly}
              onAnswer={submitGlobeAnswer}
            />
          ) : (
            <LocateCountryGlobe
              isoAlpha3={country.isoAlpha3}
              countryName={country.commonName}
              fadesOut={!isGlobeOnly}
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

      {!isCapitalStep && (
        <RangeQuestionView
          question={questions[step]}
          answer={answer}
          onAnswer={(chosen) =>
            submitAnswer(questions[step].id, chosen, rangeAnswerResult(questions[step], chosen))
          }
        />
      )}
      {isCapitalStep && asksCapital && (
        <CapitalQuestion
          country={country}
          typedCapital={typedCapital}
          onTypedCapitalChange={setTypedCapital}
          onSubmit={submitCapital}
          answer={answer}
        />
      )}

      {answer !== null && (
        <button className="flashcard__next arrow-button" onClick={goToNext} autoFocus>
          Next
        </button>
      )}
    </article>
  )
}

// The globe and capital questions are only right or wrong, never close.
function resultFromCorrect(isCorrect: boolean): AnswerResult {
  return isCorrect ? 'right' : 'wrong'
}

type RangeQuestionViewProps = {
  question: RangeQuestion
  answer: string | null
  onAnswer: (chosen: string) => void
}

function RangeQuestionView({ question, answer, onAnswer }: RangeQuestionViewProps) {
  const isAnswered = answer !== null

  // After answering, the correct option turns green and a wrong pick turns red,
  // or orange if it was one title away.
  function optionClassName(option: string): string {
    if (!isAnswered) return 'flashcard__option'
    if (option === question.correctAnswer) return 'flashcard__option flashcard__option--correct'
    if (option === answer && rangeAnswerResult(question, answer) === 'close') {
      return 'flashcard__option flashcard__option--close'
    }
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
