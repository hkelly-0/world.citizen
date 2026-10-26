import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import type { CountryIcon } from '../../shared/settings'
import { todayString } from '../flashcards/dates'
import { reviewCountry, type QuestionId } from '../flashcards/deck'
import { Flashcard } from '../flashcards/Flashcard'
import type { AnswerResult } from '../flashcards/fsrs'
import { CardReward } from '../flashcards/CardReward'
import { rewardAfterCard, type CardRewardDetails } from '../flashcards/rewardAfterCard'
import '../flashcards/FlashcardsView.css'

type PassportFlashcardViewProps = {
  // The country whose card is played, e.g. "FRA".
  isoAlpha3: string
  // The information chosen in Settings; only these questions are asked.
  learnedQuestionIds: QuestionId[]
  // Whether the card shows the country's outline or flag, chosen in Settings.
  countryIcon: CountryIcon
  // Returns to the Passport, after the reward's "Done" or "← Passport".
  onBack: () => void
}

// One country's full flashcard, opened from its card in the Passport (or from
// "New country", for an unseen one). It asks the questions chosen in Settings,
// always finding the country on the globe (never naming it). Finishing it
// reviews each question as Classic does, then its last "Next" leads to a
// reward: the Passport count going up for a new country, otherwise the
// country's familiarity. The reward's "Done" returns to the Passport.
export function PassportFlashcardView({
  isoAlpha3,
  learnedQuestionIds,
  countryIcon,
  onBack,
}: PassportFlashcardViewProps) {
  // Set once the card is finished: the Passport count for a new country's
  // first card, otherwise its familiarity.
  const [reward, setReward] = useState<CardRewardDetails | null>(null)

  function finishCard(results: Partial<Record<QuestionId, AnswerResult>>) {
    const today = todayString()
    // Read fresh, as nothing else on this screen changes the progress.
    const progress = loadProgress()
    const newProgress = reviewCountry(progress, isoAlpha3, learnedQuestionIds, results, today)
    saveProgress(newProgress)
    logCardReviews(isoAlpha3, learnedQuestionIds, results, today)
    const newReward = rewardAfterCard(isoAlpha3, progress, newProgress, learnedQuestionIds, today)
    // The country's first card (opened from "New country"): it has just
    // joined the Passport.
    if (newReward.kind === 'new-country') recordDiscovery(isoAlpha3, new Date())
    setReward(newReward)
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} label="← Passport" />
      {reward !== null ? (
        <CardReward
          reward={reward}
          continueLabel="Done"
          continueHasArrow={false}
          onContinue={onBack}
        />
      ) : (
        <Flashcard
          country={countryFacts[isoAlpha3]}
          questionIds={learnedQuestionIds}
          globeKinds={['locate']}
          countryIcon={countryIcon}
          onFinish={finishCard}
        />
      )}
    </div>
  )
}
