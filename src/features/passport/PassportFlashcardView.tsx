import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import { todayString } from '../flashcards/dates'
import { reviewCountry, type QuestionId } from '../flashcards/deck'
import { Flashcard } from '../flashcards/Flashcard'
import type { AnswerResult } from '../flashcards/fsrs'
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
export function PassportFlashcardView({
  isoAlpha3,
  learnedQuestionIds,
  onBack,
}: PassportFlashcardViewProps) {
  function finishCard(results: Partial<Record<QuestionId, AnswerResult>>) {
    const today = todayString()
    // Read fresh, as nothing else on this screen changes the progress.
    const progress = loadProgress()
    saveProgress(reviewCountry(progress, isoAlpha3, learnedQuestionIds, results, today))
    logCardReviews(isoAlpha3, learnedQuestionIds, results, today)
    // The country's first card (opened from "New country"): it has just
    // joined the Passport.
    if (Object.keys(progress[isoAlpha3] ?? {}).length === 0) recordDiscovery(isoAlpha3, new Date())
    onBack()
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} label="← Passport" />
      <Flashcard
        country={countryFacts[isoAlpha3]}
        questionIds={learnedQuestionIds}
        globeKinds={['locate']}
        finishLabel="Done"
        onFinish={finishCard}
      />
    </div>
  )
}
