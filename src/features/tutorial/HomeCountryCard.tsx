import { useState } from 'react'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { recordPlayedCountry } from '../../shared/recentCountries'
import { logReview } from '../../shared/reviewLog'
import type { CountryIcon } from '../../shared/settings'
import { CardReward } from '../flashcards/CardReward'
import { todayString } from '../flashcards/dates'
import { QUESTION_IDS, reviewAnswer, type DeckProgress, type QuestionId } from '../flashcards/deck'
import { flagOptions } from '../flashcards/flagQuestion'
import { Flashcard } from '../flashcards/Flashcard'
import type { AnswerResult } from '../flashcards/fsrs'
import { rewardAfterCard, type CardRewardDetails } from '../flashcards/rewardAfterCard'
import { HOME_CARD_NOTES, HOME_CARD_REWARD_NOTE, HOME_CARD_WARNINGS } from './tutorialNotes'
import '../flashcards/FlashcardsView.css'

type HomeCountryCardProps = {
  // The home country chosen in the tutorial, e.g. "IRL".
  isoAlpha3: string
  // The information chosen in Settings, which the reward's familiarity ring
  // covers, as in the Passport.
  learnedQuestionIds: QuestionId[]
  countryIcon: CountryIcon
  // Called by the reward's Next, going on to the Passport step.
  onContinue: () => void
}

// The home country's full card, asking every question type whatever is
// learned in Settings, so a replay shows them all. Played like a Passport card
// (always finding the country on the globe, never naming it) but with a
// tutorial note above each question and under the reward. The answers are real progress: each is
// reviewed and saved straight away, so the country joins the Passport.
export function HomeCountryCard({
  isoAlpha3,
  learnedQuestionIds,
  countryIcon,
  onContinue,
}: HomeCountryCardProps) {
  // Set once the card is finished: the Passport count for a new country's
  // first card, otherwise its familiarity.
  const [reward, setReward] = useState<CardRewardDetails | null>(null)
  // The country's progress before this card, read once when it opens.
  const [countryProgress] = useState(() => loadProgress()[isoAlpha3])
  // Chosen once, when the card is first shown.
  const [offeredFlags] = useState(() => flagOptions(isoAlpha3))
  // Replaying the tutorial can choose a country already in the Passport.
  const isNewCountry = Object.keys(countryProgress ?? {}).length === 0

  // Saved straight away, as in PassportFlashcardView. The country joins the
  // Passport, and is discovered, at its first answer.
  function answerQuestion(id: QuestionId, result: AnswerResult, isCardFinished: boolean) {
    const today = todayString()
    const progress = loadProgress()
    if (Object.keys(progress[isoAlpha3] ?? {}).length === 0) {
      recordDiscovery(isoAlpha3, new Date())
    }
    const newProgress = reviewAnswer(progress, isoAlpha3, id, result, today)
    saveProgress(newProgress)
    logReview(isoAlpha3, id, result, today)
    recordPlayedCountry(isoAlpha3, today, false)
    if (isCardFinished) finishCard(newProgress, today)
  }

  function finishCard(newProgress: DeckProgress, today: string) {
    setReward(rewardAfterCard(isoAlpha3, isNewCountry, newProgress, learnedQuestionIds, today))
  }

  return (
    <div className="flashcards-view">
      {reward !== null ? (
        <CardReward
          reward={reward}
          continueLabel="Next"
          continueHasArrow={true}
          note={HOME_CARD_REWARD_NOTE}
          onContinue={onContinue}
        />
      ) : (
        <Flashcard
          country={countryFacts[isoAlpha3]}
          questionIds={QUESTION_IDS}
          isNameQuestion={false}
          offeredFlags={offeredFlags}
          countryIcon={countryIcon}
          progress={countryProgress}
          notes={HOME_CARD_NOTES}
          warnings={HOME_CARD_WARNINGS}
          onAnswer={answerQuestion}
          onFinish={() => finishCard(loadProgress(), todayString())}
        />
      )}
    </div>
  )
}
