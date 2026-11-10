import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { recordPlayedCountry } from '../../shared/recentCountries'
import { logReview } from '../../shared/reviewLog'
import type { CountryIcon } from '../../shared/settings'
import { todayString } from '../flashcards/dates'
import { reviewAnswer, type DeckProgress, type QuestionId } from '../flashcards/deck'
import { flagOptions } from '../flashcards/flagQuestion'
import { Flashcard } from '../flashcards/Flashcard'
import type { AnswerResult } from '../flashcards/fsrs'
import { CardReward } from '../flashcards/CardReward'
import { rewardAfterCard, type CardRewardDetails } from '../flashcards/rewardAfterCard'
import { SeeOnGlobeButton, SeeOnGlobeScreen, useSeeOnGlobe } from '../flashcards/SeeOnGlobe'
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
// always finding the country on the globe (never naming it). Each answer is
// reviewed and saved straight away, as in Classic. Its last "Next" leads to a
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
  // The country's progress before this card, read once when it opens.
  const [countryProgress] = useState(() => loadProgress()[isoAlpha3])
  // Chosen once, when the card is first shown.
  const [offeredFlags] = useState(() => flagOptions(isoAlpha3))
  // Opened from "New country": no question answered yet.
  const isNewCountry = Object.keys(countryProgress ?? {}).length === 0

  // Saved straight away. The country joins the Passport, and is discovered,
  // at its first answer.
  function answerQuestion(id: QuestionId, result: AnswerResult, isCardFinished: boolean) {
    const today = todayString()
    // Read fresh, as nothing else on this screen changes the progress.
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

  // The answers are already saved; this shows the reward.
  function finishCard(newProgress: DeckProgress, today: string) {
    setReward(rewardAfterCard(isoAlpha3, isNewCountry, newProgress, learnedQuestionIds, today))
  }

  const seeOnGlobe = useSeeOnGlobe()

  return (
    <>
      {seeOnGlobe.code !== null && <SeeOnGlobeScreen code={seeOnGlobe.code} />}
      {/* Kept mounted under the globe, so the card is as it was left. */}
      <div className="flashcards-view" hidden={seeOnGlobe.code !== null}>
        <BackButton onClick={onBack} label="← Passport" />
        <SeeOnGlobeButton onClick={() => seeOnGlobe.open(isoAlpha3)} />
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
            isNameQuestion={false}
            offeredFlags={offeredFlags}
            countryIcon={countryIcon}
            progress={countryProgress}
            onAnswer={answerQuestion}
            onFinish={() => finishCard(loadProgress(), todayString())}
          />
        )}
      </div>
    </>
  )
}
