import { useState, type FormEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { isCapitalCorrect } from './capitalAnswer'
import { rangeQuestions, type RangeQuestion } from './rangeQuestions'
import './Flashcard.css'

type FlashcardProps = {
  country: CountryFacts
  // Called after the last question, with how many of the 4 were correct.
  onFinish: (correctCount: number) => void
}

// One country's card: area, population and IHDI (picked from range titles),
// then the capital (typed). Each answer is revealed before moving on.
export function Flashcard({ country, onFinish }: FlashcardProps) {
  const questions = rangeQuestions(country)
  // 0–2 are the range questions; 3 is the capital.
  const [step, setStep] = useState(0)
  // The user's answer to the current question, or null until they answer.
  const [answer, setAnswer] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [typedCapital, setTypedCapital] = useState('')

  const isCapitalStep = step === questions.length

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
      onFinish(correctCount)
    } else {
      setStep(step + 1)
      setAnswer(null)
    }
  }

  return (
    <article className="flashcard" aria-label={`${country.commonName} flashcard`}>
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

function Result({ isCorrect, correctAnswer }: { isCorrect: boolean; correctAnswer: string }) {
  return isCorrect ? (
    <p className="flashcard__result flashcard__result--correct">Correct! {correctAnswer}</p>
  ) : (
    <p className="flashcard__result flashcard__result--wrong">Wrong — it's {correctAnswer}</p>
  )
}
