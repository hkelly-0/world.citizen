import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadProgress } from '../../shared/progress'
import type { CountryIcon } from '../../shared/settings'
import { collectedCountries } from '../passport/passport'
import { BordersCard } from './BordersCard'
import { MatchingCard } from './MatchingCard'
import {
  nextMultiCountryQuestion,
  ORDERING_STATS,
  type MultiCountryQuestionId,
} from './multiCountryQuestions'
import { OrderingCard } from './OrderingCard'
import './FlashcardsView.css'

type MultiCountryPracticeViewProps = {
  // The kinds of question ticked in Custom Practice.
  questionIds: MultiCountryQuestionId[]
  // Whether the Borders card shows the country's outline or flag, chosen in Settings.
  countryIcon: CountryIcon
  onBack: () => void
}

// Custom Practice with Borders, Matching and Ordering questions ticked: one
// question after another, endlessly, each a random ticked kind
// (`nextMultiCountryQuestion`). They have no FSRS progress, so nothing is
// saved and there is no reward between questions.
export function MultiCountryPracticeView({
  questionIds,
  countryIcon,
  onBack,
}: MultiCountryPracticeViewProps) {
  // Read once: nothing here changes the Passport.
  const [passportCodes] = useState(() =>
    collectedCountries(loadProgress()).map((country) => country.isoAlpha3),
  )
  // Null when the Passport can't make any of the ticked kinds, which can't
  // happen: Custom Practice only lets kinds it can make be ticked.
  const [question, setQuestion] = useState(() =>
    nextMultiCountryQuestion(questionIds, passportCodes, null),
  )
  // Goes up with each question, so each gets a fresh card even if it shows
  // the same countries as the one before.
  const [questionNumber, setQuestionNumber] = useState(0)

  function goToNext() {
    setQuestion(nextMultiCountryQuestion(questionIds, passportCodes, question))
    setQuestionNumber(questionNumber + 1)
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {question === null ? null : question.id === 'borders' ? (
        <BordersCard
          key={questionNumber}
          code={question.codes[0]}
          countryIcon={countryIcon}
          onFinish={goToNext}
        />
      ) : question.id === 'flag-matching' ? (
        <MatchingCard key={questionNumber} kind="flag" codes={question.codes} onFinish={goToNext} />
      ) : question.id === 'capital-matching' ? (
        <MatchingCard
          key={questionNumber}
          kind="capital"
          codes={question.codes}
          onFinish={goToNext}
        />
      ) : (
        <OrderingCard
          key={questionNumber}
          stat={ORDERING_STATS[question.id]}
          codes={question.codes}
          onFinish={goToNext}
        />
      )}
    </div>
  )
}
