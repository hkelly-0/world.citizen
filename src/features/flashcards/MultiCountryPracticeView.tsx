import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadProgress } from '../../shared/progress'
import { collectedCountries } from '../passport/passport'
import { MatchingCard } from './MatchingCard'
import { MATCHING_COUNT } from './matchingQuestion'
import {
  nextMultiCountryQuestion,
  RANKING_STATS,
  type MultiCountryQuestionId,
} from './multiCountryQuestions'
import { RankingCard } from './RankingCard'
import { RANKING_COUNT } from './rankingQuestion'
import './FlashcardsView.css'

type MultiCountryPracticeViewProps = {
  // The kinds of question ticked in Custom Practice.
  questionIds: MultiCountryQuestionId[]
  onBack: () => void
}

// Custom Practice with Matching and Ranking questions ticked: one
// question after another, endlessly, each a random ticked kind
// (`nextMultiCountryQuestion`). They have no FSRS progress, so nothing is
// saved and there is no reward between questions.
export function MultiCountryPracticeView({ questionIds, onBack }: MultiCountryPracticeViewProps) {
  // Read once: nothing here changes the Passport.
  const [passportCodes] = useState(() =>
    collectedCountries(loadProgress()).map((country) => country.isoAlpha3),
  )
  // Null when the Passport can't make any of the ticked kinds.
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
      {question === null ? (
        <p className="flashcards-view__done">
          Not enough countries in your Passport yet. Matching needs {MATCHING_COUNT}, and a ranking
          needs {RANKING_COUNT} with different titles. Discover new countries in Classic Mode.
        </p>
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
        <RankingCard
          key={questionNumber}
          stat={RANKING_STATS[question.id]}
          codes={question.codes}
          onFinish={goToNext}
        />
      )}
    </div>
  )
}
