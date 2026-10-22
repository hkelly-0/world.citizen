import { useEffect, useState } from 'react'
import './TypedAnswerReveal.css'

// How long each letter of the correct answer takes to appear.
export const TYPING_MS_PER_LETTER = 40

type TypedAnswerRevealProps = {
  typed: string
  isCorrect: boolean
  // The answer to type out after a wrong one, e.g. "Pretoria, Bloemfontein, Cape Town".
  correctAnswer: string
}

// Replaces a text box once a typed question is answered. A correct answer fades
// to green with the box highlighted green. A wrong answer fades to red, and
// the correct answer is then typed out in green beside it.
export function TypedAnswerReveal({ typed, isCorrect, correctAnswer }: TypedAnswerRevealProps) {
  const [lettersTyped, setLettersTyped] = useState(0)

  useEffect(() => {
    if (isCorrect) return
    const timer = window.setInterval(() => {
      setLettersTyped((count) => {
        if (count + 1 >= correctAnswer.length) window.clearInterval(timer)
        return count + 1
      })
    }, TYPING_MS_PER_LETTER)
    return () => window.clearInterval(timer)
  }, [isCorrect, correctAnswer])

  return (
    <div className={isCorrect ? 'typed-answer__box typed-answer__box--correct' : 'typed-answer__box'}>
      <span className={isCorrect ? 'typed-answer__green' : 'typed-answer__red'}>{typed}</span>
      {!isCorrect && lettersTyped > 0 && (
        <>
          {typed !== '' && ' '}
          <span className="typed-answer__green typed-answer__green--typed">
            {correctAnswer.slice(0, lettersTyped)}
          </span>
        </>
      )}
    </div>
  )
}
