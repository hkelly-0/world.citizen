import { lazy, Suspense, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { countryFacts, type CountryFacts } from '../../shared/countryFacts'
import { COUNTRY_INFO_HEADINGS, loadCountryInfo, type CountryInfo } from '../../shared/countryInfo'
import { flagImageSrc } from '../../shared/flags'
import type { CountryIcon } from '../../shared/settings'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import {
  BORDER_ANSWER_BOXES,
  borderingCountries,
  borderBoxResults,
  markBorderAnswers,
} from './bordersQuestion'
import { isCapitalCorrect } from './capitalAnswer'
import {
  INFO_QUESTION_IDS,
  isInfoQuestion,
  QUESTION_IDS,
  type CountryProgress,
  type InfoQuestionId,
  type QuestionId,
} from './deck'
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
  // Whether the globe question names the country (true) or finds it (false).
  // Chosen by the screen showing the card, so a resumed card keeps it.
  isNameQuestion: boolean
  // The ISO alpha-3 codes of the flags offered in the flag question, in the
  // order shown (`flagOptions`). Chosen by the screen too, for the same reason.
  offeredFlags: string[]
  // Whether the picture at the top is the country's outline or its flag, chosen in Settings.
  countryIcon: CountryIcon
  // Whether to ask the borders question last (only chosen in Custom Practice).
  // It has no FSRS progress, so it is never passed to `onAnswer`.
  asksBorders?: boolean
  // The questions already answered on this card, when it is resumed: they are
  // skipped. Only read when the card is first shown.
  answeredIds?: QuestionId[]
  // The country's saved progress, used to tell whether an info question is
  // being seen for the first time. Missing for a country never answered.
  progress?: CountryProgress
  // Called as soon as each question is answered, so the answer can be saved
  // straight away: right, close (range questions only) or wrong.
  // `isCardFinished` is true when that answer ends the card (an info rating
  // on the last question, or the globe answer of a card asking only that);
  // then `onFinish` isn't called.
  onAnswer: (id: QuestionId, result: AnswerResult, isCardFinished: boolean) => void
  // Called when Next is pressed after the last question's answer, which ends
  // the card without a new answer.
  onFinish: () => void
}

// One country's card: first a globe question, then the flag (picked from four),
// then area, population and IHDI (picked from range titles), then the capital
// (typed), skipping any not in `questionIds`, then, if `asksBorders` and the
// country has any land neighbours, its borders (up to four typed), then the
// info questions in `questionIds` (a paragraph revealed and self-rated). The globe
// question is either finding the country (tapped on the globe) or naming the
// country shown on the globe (typed), as `isNameQuestion` says.
// Each answer is revealed before moving on. A resumed card skips the
// questions in `answeredIds`.
export function Flashcard({
  country,
  questionIds,
  isNameQuestion,
  offeredFlags,
  countryIcon,
  asksBorders = false,
  answeredIds = [],
  progress = {},
  onAnswer,
  onFinish,
}: FlashcardProps) {
  // Kept from when the card is first shown, as the screen updates
  // `answeredIds` with each answer.
  const [answeredAtStart] = useState(answeredIds)
  const asksGlobe = questionIds.includes('globe') && !answeredAtStart.includes('globe')
  const questions = rangeQuestions(country)
  const borderCodes = borderingCountries(country.isoAlpha3)
  // The questions asked after the globe one: the facts in the order of
  // QUESTION_IDS, then the borders question, then the info questions, leaving
  // out any answered before the card was resumed.
  const allSteps: (QuestionId | 'borders')[] = QUESTION_IDS.filter(
    (id) => id !== 'globe' && !isInfoQuestion(id) && questionIds.includes(id),
  )
  if (asksBorders && borderCodes.length > 0) allSteps.push('borders')
  allSteps.push(...INFO_QUESTION_IDS.filter((id) => questionIds.includes(id)))
  const steps = allSteps.filter((id) => id === 'borders' || !answeredAtStart.includes(id))
  const asksInfo = steps.some((id) => id !== 'borders' && isInfoQuestion(id))
  // With only the globe question, the globe doesn't fade to reveal the card,
  // which would flash up for a moment before the next card's globe.
  const isGlobeOnly = asksGlobe && steps.length === 0
  // Whether the user has answered the globe question yet (or it isn't asked).
  const [hasAnsweredGlobe, setHasAnsweredGlobe] = useState(!asksGlobe)
  // Counts through `steps`.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  // Whether the flag question has been answered on this screen.
  const [hasAnsweredFlag, setHasAnsweredFlag] = useState(false)
  const [typedCapital, setTypedCapital] = useState('')
  const [typedBorders, setTypedBorders] = useState<string[]>(() =>
    Array(BORDER_ANSWER_BOXES).fill(''),
  )
  // The country's paragraphs, undefined until its file has loaded (only
  // loaded if an info question is asked).
  const [info, setInfo] = useState<CountryInfo | undefined>(undefined)

  // Starts loading straight away, so the text has usually arrived by the time
  // the info questions are reached.
  useEffect(() => {
    if (!asksInfo) return
    let cancelled = false
    loadCountryInfo(country.isoAlpha3).then((loaded) => {
      if (!cancelled) setInfo(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [asksInfo, country.isoAlpha3])

  const stepId = steps[step]
  const rangeQuestion = questions.find((question) => question.id === stepId)
  const isLastStep = step === steps.length - 1
  // Showing the flag before the flag question is answered would give it away,
  // so a question mark stands in for it until then. On a resumed card already
  // past it, `steps` no longer has it.
  const hidesFlag = steps.includes('flag') && !hasAnsweredFlag

  function submitGlobeAnswer(result: AnswerResult) {
    setHasAnsweredGlobe(true)
    // When only the globe question is asked, the card is finished.
    onAnswer('globe', result, steps.length === 0)
  }

  function submitAnswer(id: QuestionId, chosen: string, result: AnswerResult) {
    setAnswer(chosen)
    if (id === 'flag') setHasAnsweredFlag(true)
    onAnswer(id, result, false)
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
      onFinish()
    } else {
      setStep(step + 1)
      setAnswer(null)
    }
  }

  // An info question's rating acts as its answer and Next together.
  function rateInfo(id: InfoQuestionId, result: AnswerResult) {
    onAnswer(id, result, isLastStep)
    if (!isLastStep) setStep(step + 1)
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
              onAnswer={(isCorrect) => submitGlobeAnswer(resultFromCorrect(isCorrect))}
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

      {/* Centred in the space between the name and the Next button. */}
      <div className="flashcard__body">
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
        {stepId !== undefined && stepId !== 'borders' && isInfoQuestion(stepId) && (
          <InfoQuestion
            // Keyed so the next info question starts hidden again.
            key={stepId}
            heading={COUNTRY_INFO_HEADINGS[stepId]}
            text={info?.[stepId]}
            isFirstTime={progress[stepId] === undefined}
            onRate={(result) => rateInfo(stepId, result)}
          />
        )}
      </div>

      {/* Until answered, an empty space keeps Next's spot so the question
          doesn't move when Next appears. Info questions never show Next: their
          rating goes on instead. */}
      {answer !== null ? (
        <button className="flashcard__next arrow-button" onClick={goToNext} autoFocus>
          Next
        </button>
      ) : (
        <div className="flashcard__next-space" aria-hidden="true" />
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

// The self-ratings offered once an info paragraph is revealed, each scored
// like a question's answer.
const INFO_RATINGS: { result: AnswerResult; label: string }[] = [
  { result: 'wrong', label: 'Forgot' },
  { result: 'close', label: 'Partly' },
  { result: 'right', label: 'Remembered' },
]

// The same ratings, worded for an info question never answered before, as
// there is nothing to remember yet. Scored the same as `INFO_RATINGS`.
const FIRST_TIME_INFO_RATINGS: { result: AnswerResult; label: string }[] = [
  { result: 'wrong', label: 'New info' },
  { result: 'close', label: 'Partly new' },
  { result: 'right', label: 'Already known' },
]

type InfoQuestionProps = {
  heading: string
  // The paragraph, or undefined while the country's file is loading.
  text: string | undefined
  // Whether the question has never been answered before, which changes the
  // ratings' wording.
  isFirstTime: boolean
  onRate: (result: AnswerResult) => void
}

// An info question: the topic's heading with a Reveal button. Revealing shows
// the paragraph and the ratings; picking one goes on.
function InfoQuestion({ heading, text, isFirstTime, onRate }: InfoQuestionProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const ratings = isFirstTime ? FIRST_TIME_INFO_RATINGS : INFO_RATINGS

  return (
    <>
      <p className="flashcard__question">{heading}</p>
      {isRevealed ? (
        <>
          <p className="flashcard__info-text">{text}</p>
          <div
            className="flashcard__options"
            role="group"
            aria-label={isFirstTime ? 'How much was new?' : 'How well did you remember?'}
          >
            {ratings.map(({ result, label }) => (
              <button
                key={result}
                className={`flashcard__option flashcard__rating--${isFirstTime ? 'first-' : ''}${result}`}
                onClick={() => onRate(result)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          className="flashcard__check"
          onClick={() => setIsRevealed(true)}
          disabled={text === undefined}
          autoFocus
        >
          Reveal
        </button>
      )}
    </>
  )
}
