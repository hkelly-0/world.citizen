import { useEffect, useState } from 'react'
import { correctedSpelling } from '../../shared/typoMatch'
import './TypedAnswerReveal.css'

// How long each letter of the correct answer takes to appear.
export const TYPING_MS_PER_LETTER = 40

// Gap between one letter starting its jump and the next, for a correct answer.
export const JUMP_MS_PER_LETTER = 60

type TypedAnswerRevealProps = {
  typed: string
  isCorrect: boolean
  // The answer to type out after a wrong one, e.g. "Pretoria, Bloemfontein, Cape Town".
  correctAnswer: string
  // For a correct answer, the accepted name it matched (e.g. "Ouagadougou"),
  // shown in place of the answer with its accents and typos fixed
  // (`correctedSpelling`).
  acceptedName?: string | null
}

// Replaces a text box once a typed question is answered. A correct answer fades
// to green with the box highlighted green, and its letters jump up and down
// one after another, its accents and typos fixed. A wrong answer fades to
// red, and the correct answer is then typed out in green beside it.
export function TypedAnswerReveal({
  typed,
  isCorrect,
  correctAnswer,
  acceptedName = null,
}: TypedAnswerRevealProps) {
  const [lettersTyped, setLettersTyped] = useState(0)
  const shownAnswer =
    isCorrect && acceptedName !== null ? correctedSpelling(typed, acceptedName) : typed

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
    <div
      className={
        isCorrect
          ? 'typed-answer__box typed-answer__box--answered typed-answer__box--correct'
          : 'typed-answer__box typed-answer__box--answered'
      }
    >
      <span>
        {isCorrect ? (
          // Each letter is hidden from screen readers; the label reads the whole answer.
          <span className="typed-answer__green" aria-label={shownAnswer}>
            {[...shownAnswer].map((letter, index) => (
              <span
                key={index}
                className="typed-answer__jump-letter"
                style={{ animationDelay: `${index * JUMP_MS_PER_LETTER}ms` }}
                aria-hidden="true"
              >
                {letter}
              </span>
            ))}
          </span>
        ) : (
          <span className="typed-answer__red">{typed}</span>
        )}
        {!isCorrect && lettersTyped > 0 && (
          <>
            {typed !== '' && ' '}
            <span className="typed-answer__green typed-answer__green--typed">
              {correctAnswer.slice(0, lettersTyped)}
            </span>
          </>
        )}
      </span>
    </div>
  )
}
