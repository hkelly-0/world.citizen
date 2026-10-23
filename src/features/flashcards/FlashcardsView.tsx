import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import { averageRecall } from '../passport/passport'
import { todayString } from './dates'
import {
  chooseNextCountry,
  countryDueDate,
  reviewCountry,
  type DeckProgress,
  type GlobeKind,
  type QuestionId,
} from './deck'
import { Flashcard } from './Flashcard'
import type { AnswerResult } from './fsrs'
import './FlashcardsView.css'

const ALL_CODES = Object.keys(countryFacts)

// Before a new country, the user is warned if the average chance of still
// remembering the countries already seen 30 days from now (`averageRecall`) is
// below this.
const NEW_COUNTRY_WARNING_RECALL = 0.8

type FlashcardsViewProps = {
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // Which kinds of globe question may be asked, if the globe question is.
  globeKinds: GlobeKind[]
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, chosen by FSRS,
// and saves progress after each card. Only the questions in `questionIds` are
// asked, and only they decide which countries are due. Before a new country,
// it warns if the countries already seen aren't familiar enough yet, until the
// user chooses to go on (once per visit to the screen).
export function FlashcardsView({ questionIds, globeKinds, onBack }: FlashcardsViewProps) {
  // Fixed while the screen is open, so a session past midnight stays consistent.
  const [today] = useState(todayString)
  const [progress, setProgress] = useState<DeckProgress>(loadProgress)
  // The country being shown, or null when there are no cards left today.
  const [currentCode, setCurrentCode] = useState<string | null>(() =>
    chooseNextCountry(ALL_CODES, progress, today, questionIds),
  )
  // Set by "Discover a new country anyways →"; not shown again until the
  // screen is reopened.
  const [newCountryWarningDismissed, setNewCountryWarningDismissed] = useState(false)

  // New for the questions being asked: none of them answered yet.
  const currentIsNew =
    currentCode !== null && countryDueDate(progress[currentCode], questionIds) === null
  const recall = averageRecall(progress, questionIds, today)
  const showNewCountryWarning =
    currentIsNew &&
    !newCountryWarningDismissed &&
    recall !== null &&
    recall < NEW_COUNTRY_WARNING_RECALL

  // Each asked question gets its own FSRS review, even ones that weren't due
  // yet. Questions not asked keep their progress.
  function finishCard(code: string, results: Partial<Record<QuestionId, AnswerResult>>) {
    const newProgress = reviewCountry(progress, code, questionIds, results, today)
    setProgress(newProgress)
    saveProgress(newProgress)
    logCardReviews(code, questionIds, results, today)
    // The country's first card: it has just joined the Passport.
    if (Object.keys(progress[code] ?? {}).length === 0) recordDiscovery(code, new Date())
    setCurrentCode(chooseNextCountry(ALL_CODES, newProgress, today, questionIds))
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {currentCode === null ? (
        <p className="flashcards-view__done">No more cards today. Come back tomorrow!</p>
      ) : showNewCountryWarning ? (
        <div className="flashcards-view__warning">
          <p>
            It's recommended to become familiar with the countries you've already seen before
            learning new ones.
          </p>
          <button
            type="button"
            className="flashcards-view__discover"
            onClick={() => setNewCountryWarningDismissed(true)}
          >
            Discover a new country anyways →
          </button>
        </div>
      ) : (
        // The key gives each country a fresh card, resetting its answers.
        <Flashcard
          key={currentCode}
          country={countryFacts[currentCode]}
          questionIds={questionIds}
          globeKinds={globeKinds}
          onFinish={(results) => finishCard(currentCode, results)}
        />
      )}
    </div>
  )
}
