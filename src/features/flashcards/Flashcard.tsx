import { lazy, Suspense, useState, type FormEvent, type KeyboardEvent } from 'react'
import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { flagImageSrc } from '../../shared/flags'
import type { CountryIcon } from '../../shared/settings'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import {
  BORDER_ANSWER_BOXES,
  borderingCountries,
  markBorderAnswers,
  missedBorderBoxes,
} from './bordersQuestion'
import { isCapitalCorrect } from './capitalAnswer'
import { QUESTION_IDS, type GlobeKind, type QuestionId } from './deck'
import { flagOptions } from './flagQuestion'
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
  // Which questions to ask: those learned in Settings for Classic, or those
  // ticked for custom practice.
  questionIds: QuestionId[]
  // Which kinds of globe question may be asked: both for Classic, where each
  // card picks one at random, or just one for custom practice.
  globeKinds: GlobeKind[]
  // Whether the picture at the top is the country's outline or its flag, chosen in Settings.
  countryIcon: CountryIcon
  // Whether to ask the borders question last (only chosen in Custom Practice).
  // It has no FSRS progress, so it never appears in `onFinish`'s results.
  asksBorders?: boolean
  // Called after the last question, with how each asked question was answered:
  // right, close (range questions only) or wrong.
  onFinish: (results: Partial<Record<QuestionId, AnswerResult>>) => void
}

// One country's card: first a globe question, then the flag (picked from four),
// then area, population and IHDI (picked from range titles), then the capital
// (typed), skipping any not in `questionIds`, then, if `asksBorders` and the
// country has any land neighbours, its borders (up to four typed). The globe
// question is, at random half the time each, either finding the country
// (tapped on the globe) or naming the country shown on the globe (typed).
// Each answer is revealed before moving on.
export function Flashcard({
  country,
  questionIds,
  globeKinds,
  countryIcon,
  asksBorders = false,
  onFinish,
}: FlashcardProps) {
  const asksGlobe = questionIds.includes('globe')
  const questions = rangeQuestions(country)
  const borderCodes = borderingCountries(country.isoAlpha3)
  // The questions asked after the globe one, in the order of QUESTION_IDS,
  // then the borders question.
  const steps: (QuestionId | 'borders')[] = QUESTION_IDS.filter(
    (id) => id !== 'globe' && questionIds.includes(id),
  )
  if (asksBorders && borderCodes.length > 0) steps.push('borders')
  // With only the globe question, the globe doesn't fade to reveal the card,
  // which would flash up for a moment before the next card's globe.
  const isGlobeOnly = asksGlobe && steps.length === 0
  // Chosen once, when the card is first shown: at random if both kinds are allowed.
  const [isNameQuestion] = useState(() =>
    globeKinds.length === 1 ? globeKinds[0] === 'name' : Math.random() < 0.5,
  )
  // Whether the user has answered the globe question yet (or it isn't asked).
  const [hasAnsweredGlobe, setHasAnsweredGlobe] = useState(!asksGlobe)
  // Chosen once, when the card is first shown.
  const [offeredFlags] = useState(() => flagOptions(country.isoAlpha3))
  // Counts through `steps`.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  // How each question answered so far went.
  const [results, setResults] = useState<Partial<Record<QuestionId, AnswerResult>>>({})
  const [typedCapital, setTypedCapital] = useState('')
  const [typedBorders, setTypedBorders] = useState<string[]>(() =>
    Array(BORDER_ANSWER_BOXES).fill(''),
  )

  const stepId = steps[step]
  const rangeQuestion = questions.find((question) => question.id === stepId)
  const isLastStep = step === steps.length - 1
  // Showing the flag before the flag question is answered would give it away,
  // so a question mark stands in for it until then.
  const hidesFlag = steps.includes('flag') && results.flag === undefined

  function submitGlobeAnswer(isCorrect: boolean) {
    const newResults = { ...results, globe: resultFromCorrect(isCorrect) }
    setHasAnsweredGlobe(true)
    setResults(newResults)
    // When only the globe question is asked, the card is finished.
    if (steps.length === 0) onFinish(newResults)
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

  // The borders question has no FSRS progress, so it adds no result.
  function submitBorders(event: FormEvent) {
    event.preventDefault()
    // Marks the question answered; the boxes' text stays in `typedBorders`.
    setAnswer(typedBorders.join(', '))
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
      {countryIcon === 'outline' && (
        <img
          className="flashcard__image"
          src={`${COUNTRY_IMAGES}/${country.isoAlpha3}.webp`}
          alt={`Map of ${country.commonName}`}
        />
      )}
      {countryIcon === 'flag' && hidesFlag && (
        <div className="flashcard__image flashcard__hidden-flag" aria-hidden="true">
          ?
        </div>
      )}
      {countryIcon === 'flag' && !hidesFlag && (
        <img
          className="flashcard__image flashcard__flag-image"
          src={flagImageSrc(country.isoAlpha3)}
          alt={`Flag of ${country.commonName}`}
        />
      )}
      <h2>{country.commonName}</h2>

      {stepId === 'flag' && (
        <FlagQuestion
          correctCode={country.isoAlpha3}
          offeredCodes={offeredFlags}
          answer={answer}
          onAnswer={(chosen) =>
            submitAnswer('flag', chosen, resultFromCorrect(chosen === country.isoAlpha3))
          }
          onContinue={goToNext}
        />
      )}
      {rangeQuestion !== undefined && (
        <RangeQuestionView
          question={rangeQuestion}
          answer={answer}
          onAnswer={(chosen) =>
            submitAnswer(rangeQuestion.id, chosen, rangeAnswerResult(rangeQuestion, chosen))
          }
          onContinue={goToNext}
        />
      )}
      {stepId === 'capital' && (
        <CapitalQuestion
          country={country}
          typedCapital={typedCapital}
          onTypedCapitalChange={setTypedCapital}
          onSubmit={submitCapital}
          answer={answer}
        />
      )}
      {stepId === 'borders' && (
        <BordersQuestion
          country={country}
          borderCodes={borderCodes}
          typedBorders={typedBorders}
          onTypedBordersChange={setTypedBorders}
          onSubmit={submitBorders}
          isAnswered={answer !== null}
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

// The globe, flag and capital questions are only right or wrong, never close.
function resultFromCorrect(isCorrect: boolean): AnswerResult {
  return isCorrect ? 'right' : 'wrong'
}

type FlagQuestionProps = {
  correctCode: string
  // The ISO alpha-3 codes of the flags to pick from, in the order shown.
  offeredCodes: string[]
  // The code of the picked flag, or null until one is picked.
  answer: string | null
  onAnswer: (chosen: string) => void
  // Called when a flag is clicked after answering, like pressing Next.
  onContinue: () => void
}

// Four flags in a 2 × 2 grid. Before answering they are labelled only by
// position, so the names don't give the answer away; after answering, each
// is named and coloured like the range options, and clicking any of them
// goes on, like Next.
function FlagQuestion({
  correctCode,
  offeredCodes,
  answer,
  onAnswer,
  onContinue,
}: FlagQuestionProps) {
  const isAnswered = answer !== null

  function optionClassName(code: string): string {
    if (!isAnswered) return 'flashcard__flag-option'
    const answered = 'flashcard__flag-option flashcard__option--answered'
    if (code === correctCode) return `${answered} flashcard__option--correct`
    if (code === answer) return `${answered} flashcard__option--wrong`
    return answered
  }

  return (
    <>
      <p className="flashcard__question">Flag?</p>
      <div className="flashcard__flag-options">
        {offeredCodes.map((code, i) => (
          <button
            key={code}
            className={optionClassName(code)}
            onClick={() => (isAnswered ? onContinue() : onAnswer(code))}
            aria-label={isAnswered ? `Flag of ${countryFacts[code].commonName}` : `Flag ${i + 1}`}
          >
            <img className="flashcard__flag" src={flagImageSrc(code)} alt="" />
            {isAnswered && (
              <span className="flashcard__flag-name">{countryFacts[code].commonName}</span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

type RangeQuestionViewProps = {
  question: RangeQuestion
  answer: string | null
  onAnswer: (chosen: string) => void
  // Called when an option is clicked after answering, like pressing Next.
  onContinue: () => void
}

// After answering, clicking any option goes on, like Next.
function RangeQuestionView({ question, answer, onAnswer, onContinue }: RangeQuestionViewProps) {
  const isAnswered = answer !== null

  // After answering, the correct option turns green and a wrong pick turns red,
  // or orange if it was one title away.
  function optionClassName(option: string): string {
    if (!isAnswered) return 'flashcard__option'
    const answered = 'flashcard__option flashcard__option--answered'
    if (option === question.correctAnswer) return `${answered} flashcard__option--correct`
    if (option === answer && rangeAnswerResult(question, answer) === 'close') {
      return `${answered} flashcard__option--close`
    }
    if (option === answer) return `${answered} flashcard__option--wrong`
    return answered
  }

  return (
    <>
      <p className="flashcard__question">{question.label}?</p>
      <div className="flashcard__options">
        {question.options.map((option) => (
          <button
            key={option}
            className={optionClassName(option)}
            onClick={() => (isAnswered ? onContinue() : onAnswer(option))}
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

type BordersQuestionProps = {
  country: CountryFacts
  // The countries bordering `country`, in the order to list them on reveal.
  borderCodes: string[]
  typedBorders: string[]
  onTypedBordersChange: (typed: string[]) => void
  onSubmit: (event: FormEvent) => void
  isAnswered: boolean
}

// Four text boxes for naming countries that border this one; boxes may be left
// blank, which is right for a country with fewer than four neighbours. Enter
// moves to the next box, and in the last box reveals the answers. On reveal
// each filled box turns green if it names a bordering country (not already
// named in an earlier box) or red otherwise. A blank box also turns red if a
// bordering country could have gone in it (`missedBorderBoxes`). Every
// bordering country is listed below: those named first, in green and in the
// order typed, then the rest in `borderCodes` order.
function BordersQuestion({
  country,
  borderCodes,
  typedBorders,
  onTypedBordersChange,
  onSubmit,
  isAnswered,
}: BordersQuestionProps) {
  const marks = markBorderAnswers(typedBorders, borderCodes)
  const missed = missedBorderBoxes(typedBorders, borderCodes)
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
        const isCorrect = marks[index] !== null
        const isWrong = (typed.trim() !== '' && !isCorrect) || missed[index]
        const answered = 'typed-answer__box typed-answer__box--answered'
        let className = answered
        if (isCorrect) className = `${answered} typed-answer__box--correct`
        if (isWrong) className = `${answered} flashcard__border-box--wrong`
        return (
          <div key={index} className={className} aria-label={label}>
            <span className={isCorrect ? 'typed-answer__green' : 'typed-answer__red'}>{typed}</span>
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
