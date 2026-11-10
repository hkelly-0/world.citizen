import { Fragment, lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { countryFacts, type CountryFacts, type IhdiBreakdown } from '../../shared/countryFacts'
import { COUNTRY_INFO_HEADINGS, loadCountryInfo, type CountryInfo } from '../../shared/countryInfo'
import { flagImageSrc } from '../../shared/flags'
import { IhdiBreakdownButton } from '../../shared/IhdiBreakdownButton'
import { RangeTitle } from '../../shared/RangeTitle'
import type { CountryIcon } from '../../shared/settings'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
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
import { TutorialNote } from '../tutorial/TutorialNote'
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
  // The questions already answered on this card, when it is resumed: they are
  // skipped. Only read when the card is first shown.
  answeredIds?: QuestionId[]
  // The country's saved progress, used to tell whether an info question is
  // being seen for the first time. Missing for a country never answered.
  progress?: CountryProgress
  // The tutorial's explanations, shown above each question they name (the
  // globe question's on the globe). Only the home country's card has them.
  notes?: Partial<Record<QuestionId, string>>
  // The tutorial's warnings, shown in a red box below the note of each
  // question they name. Only the home country's card has them.
  warnings?: Partial<Record<QuestionId, string>>
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
// (typed), skipping any not in `questionIds`, then the info questions in
// `questionIds` (a paragraph revealed and self-rated). The globe
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
  answeredIds = [],
  progress = {},
  notes = {},
  warnings = {},
  onAnswer,
  onFinish,
}: FlashcardProps) {
  // Kept from when the card is first shown, as the screen updates
  // `answeredIds` with each answer.
  const [answeredAtStart] = useState(answeredIds)
  const asksGlobe = questionIds.includes('globe') && !answeredAtStart.includes('globe')
  const questions = rangeQuestions(country)
  // The questions asked after the globe one: the facts in the order of
  // QUESTION_IDS, then the info questions, leaving out any answered before the
  // card was resumed.
  const allSteps: QuestionId[] = QUESTION_IDS.filter(
    (id) => id !== 'globe' && !isInfoQuestion(id) && questionIds.includes(id),
  )
  allSteps.push(...INFO_QUESTION_IDS.filter((id) => questionIds.includes(id)))
  const steps = allSteps.filter((id) => !answeredAtStart.includes(id))
  const asksInfo = steps.some(isInfoQuestion)
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
  const stepNote = stepId === undefined ? undefined : notes[stepId]
  const stepWarning = stepId === undefined ? undefined : warnings[stepId]
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
      resultFromCorrect(isCapitalCorrect(typedCapital, country)),
    )
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

  // Next is focused when it appears, so Enter or Space presses it. Not with
  // autoFocus: that also scrolls Next into view, which on a phone jumps the
  // page down as soon as an answer is picked. preventScroll keeps the scroll
  // where it was.
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (answer !== null) nextButtonRef.current?.focus({ preventScroll: true })
  }, [answer])

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
              note={notes.globe}
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
        {stepNote !== undefined && <TutorialNote text={stepNote} />}
        {stepWarning !== undefined && <TutorialNote text={stepWarning} isWarning />}
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
            ihdiBreakdown={country.ihdiBreakdown}
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
        {stepId !== undefined && isInfoQuestion(stepId) && (
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
          doesn't move when Next appears. Info questions never show Next (their
          rating goes on instead), so they get no space either. */}
      {answer !== null ? (
        <button className="flashcard__next arrow-button" ref={nextButtonRef} onClick={goToNext}>
          Next
        </button>
      ) : (
        !(stepId !== undefined && isInfoQuestion(stepId)) && (
          <div className="flashcard__next-space" aria-hidden="true" />
        )
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
  // The country's IHDI breakdown, opened from a "?" after the IHDI question's
  // value. Null when the IHDI is estimated.
  ihdiBreakdown: IhdiBreakdown | null
  answer: string | null
  onAnswer: (chosen: string) => void
  // Called when an option is clicked after answering, like pressing Next.
  onContinue: () => void
}

// After answering, clicking any option goes on, like Next.
function RangeQuestionView({
  question,
  ihdiBreakdown,
  answer,
  onAnswer,
  onContinue,
}: RangeQuestionViewProps) {
  const isAnswered = answer !== null

  // After answering, the correct option turns green and a wrong pick turns red,
  // or orange if it was one range away. Options are told apart by name.
  function optionClassName(name: string): string {
    if (!isAnswered) return 'flashcard__option'
    const answered = 'flashcard__option flashcard__option--answered'
    if (name === question.correctAnswer.name) return `${answered} flashcard__option--correct`
    if (name === answer && rangeAnswerResult(question, answer) === 'close') {
      return `${answered} flashcard__option--close`
    }
    if (name === answer) return `${answered} flashcard__option--wrong`
    return answered
  }

  return (
    <>
      <p className="flashcard__question">{question.label}?</p>
      <div className="flashcard__options">
        {question.options.map((option) => (
          <Fragment key={option.name}>
            <button
              className={optionClassName(option.name)}
              onClick={() => (isAnswered ? onContinue() : onAnswer(option.name))}
            >
              <RangeTitle range={option} />
            </button>
            {/* Once answered, the country's own value goes under the correct
                option, followed for IHDI by the "?" that opens its breakdown.
                With no data there is no value, so no "?" either. */}
            {isAnswered &&
              option.name === question.correctAnswer.name &&
              question.trueValue !== null && (
                <p className="flashcard__true-value">
                  {question.trueValue}
                  {question.id === 'ihdi' && <IhdiBreakdownButton breakdown={ihdiBreakdown} />}
                </p>
              )}
          </Fragment>
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
            isCorrect={isCapitalCorrect(answer, country)}
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
