import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadProgress } from '../../shared/progress'
import { collectedCountries } from '../passport/passport'
import { FlagMatchingCard } from './FlagMatchingCard'
import { FLAG_MATCHING_COUNT, flagMatchingCountries } from './flagMatchingQuestion'
import './FlashcardsView.css'

type FlagMatchingViewProps = {
  onBack: () => void
}

// Custom Practice with only Flag Matching ticked: one flag matching question
// after another, endlessly, each starting from a different random Passport
// country than the one before. It has no FSRS progress, so nothing is saved
// and there is no reward between questions.
export function FlagMatchingView({ onBack }: FlagMatchingViewProps) {
  // Read once: nothing here changes the Passport.
  const [passportCodes] = useState(() =>
    collectedCountries(loadProgress()).map((country) => country.isoAlpha3),
  )
  // The current question's countries, or null with too few Passport countries.
  const [codes, setCodes] = useState(() => flagMatchingCountries(passportCodes, null))
  // Goes up with each question, so each gets a fresh card even if it shows
  // the same countries as the one before.
  const [questionNumber, setQuestionNumber] = useState(0)

  function goToNext() {
    setCodes(flagMatchingCountries(passportCodes, codes === null ? null : codes[0]))
    setQuestionNumber(questionNumber + 1)
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {codes === null ? (
        <p className="flashcards-view__done">
          Flag Matching needs at least {FLAG_MATCHING_COUNT} countries in your Passport. Discover
          new countries in Classic Mode.
        </p>
      ) : (
        <FlagMatchingCard key={questionNumber} codes={codes} onFinish={goToNext} />
      )}
    </div>
  )
}
