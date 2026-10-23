import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import { todayString } from '../flashcards/dates'
import { reviewCountry, type QuestionId } from '../flashcards/deck'
import { Flashcard } from '../flashcards/Flashcard'
import type { AnswerResult } from '../flashcards/fsrs'
import { NewCountryReward } from '../flashcards/NewCountryReward'
import { collectedCountries } from './passport'
import '../flashcards/FlashcardsView.css'

type PassportFlashcardViewProps = {
  // The country whose card is played, e.g. "FRA".
  isoAlpha3: string
  // The information chosen in Settings; only these questions are asked.
  learnedQuestionIds: QuestionId[]
  // Returns to the Passport, after "Done" or "← Passport".
  onBack: () => void
}

// One country's full flashcard, opened from its card in the Passport (or from
// "New country", for an unseen one). It asks the questions chosen in Settings,
// always finding the country on the globe (never naming it). Finishing it
// reviews each question as Classic does, then "Done" returns to the Passport.
// A new country's card instead ends with "Next", leading to the Passport count
// going up, with its own "Done".
export function PassportFlashcardView({
  isoAlpha3,
  learnedQuestionIds,
  onBack,
}: PassportFlashcardViewProps) {
  // Not yet in the Passport: no question answered. Fixed when the screen
  // opens, so finishing the card doesn't change it.
  const [isNewCountry] = useState(() => Object.keys(loadProgress()[isoAlpha3] ?? {}).length === 0)
  // How many countries were in the Passport before this one joined; null
  // until a new country's first card is finished.
  const [rewardCountBefore, setRewardCountBefore] = useState<number | null>(null)

  function finishCard(results: Partial<Record<QuestionId, AnswerResult>>) {
    const today = todayString()
    // Read fresh, as nothing else on this screen changes the progress.
    const progress = loadProgress()
    saveProgress(reviewCountry(progress, isoAlpha3, learnedQuestionIds, results, today))
    logCardReviews(isoAlpha3, learnedQuestionIds, results, today)
    // The country's first card (opened from "New country"): it has just
    // joined the Passport.
    if (isNewCountry) {
      recordDiscovery(isoAlpha3, new Date())
      setRewardCountBefore(collectedCountries(progress).length)
    } else {
      onBack()
    }
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} label="← Passport" />
      {rewardCountBefore !== null ? (
        <NewCountryReward
          countryName={countryFacts[isoAlpha3].commonName}
          countBefore={rewardCountBefore}
          continueLabel="Done"
          onContinue={onBack}
        />
      ) : (
        <Flashcard
          country={countryFacts[isoAlpha3]}
          questionIds={learnedQuestionIds}
          globeKinds={['locate']}
          finishLabel={isNewCountry ? 'Next' : 'Done'}
          onFinish={finishCard}
        />
      )}
    </div>
  )
}
