import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import {
  collectedCountries,
  isTooUnfamiliarForNewCountry,
  NEW_COUNTRY_WARNING,
} from '../passport/passport'
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

type FlashcardsViewProps = {
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // Which kinds of globe question may be asked, if the globe question is.
  globeKinds: GlobeKind[]
  // True for Classic. False for Custom Practice, which only shows countries
  // already in the Passport, so new countries are only discovered in Classic.
  canDiscoverCountries: boolean
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, chosen by FSRS,
// and saves progress after each card. Only the questions in `questionIds` are
// asked, and only they decide which countries are due. Before a new country,
// it warns if the countries already seen aren't familiar enough yet, until the
// user chooses to go on (once per visit to the screen). Otherwise, a country
// not yet in the Passport is introduced with a "Discovering a new country"
// screen before its card.
export function FlashcardsView({
  questionIds,
  globeKinds,
  canDiscoverCountries,
  onBack,
}: FlashcardsViewProps) {
  // Fixed while the screen is open, so a session past midnight stays consistent.
  const [today] = useState(todayString)
  const [progress, setProgress] = useState<DeckProgress>(loadProgress)

  // The countries cards may come from: all 195, or only those in the Passport.
  // A Passport country can still be asked a question for the first time.
  function cardCodes(progress: DeckProgress): string[] {
    if (canDiscoverCountries) return ALL_CODES
    return collectedCountries(progress).map((country) => country.isoAlpha3)
  }

  // The country being shown, or null when there are no cards left today.
  const [currentCode, setCurrentCode] = useState<string | null>(() =>
    chooseNextCountry(cardCodes(progress), progress, today, questionIds),
  )
  // Set by "Discover a new country anyway →"; not shown again until the
  // screen is reopened.
  const [newCountryWarningDismissed, setNewCountryWarningDismissed] = useState(false)
  // The country whose "Discovering a new country" screen has been passed, by
  // "Go →" or by "Discover a new country anyway →".
  const [discoveryScreenPassedFor, setDiscoveryScreenPassedFor] = useState<string | null>(null)

  // New for the questions being asked: none of them answered yet.
  const currentIsNew =
    currentCode !== null && countryDueDate(progress[currentCode], questionIds) === null
  // Only when the card could be a country not yet in the Passport.
  const showNewCountryWarning =
    canDiscoverCountries &&
    currentIsNew &&
    !newCountryWarningDismissed &&
    isTooUnfamiliarForNewCountry(progress, questionIds, today)
  // Not yet in the Passport: no question answered, including ones not asked.
  const currentIsUndiscovered =
    currentCode !== null && Object.keys(progress[currentCode] ?? {}).length === 0
  const showDiscoveryScreen =
    canDiscoverCountries && currentIsUndiscovered && discoveryScreenPassedFor !== currentCode

  // Each asked question gets its own FSRS review, even ones that weren't due
  // yet. Questions not asked keep their progress.
  function finishCard(code: string, results: Partial<Record<QuestionId, AnswerResult>>) {
    const newProgress = reviewCountry(progress, code, questionIds, results, today)
    setProgress(newProgress)
    saveProgress(newProgress)
    logCardReviews(code, questionIds, results, today)
    // The country's first card: it has just joined the Passport.
    if (Object.keys(progress[code] ?? {}).length === 0) recordDiscovery(code, new Date())
    setCurrentCode(chooseNextCountry(cardCodes(newProgress), newProgress, today, questionIds))
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {currentCode === null ? (
        <p className="flashcards-view__done">
          {canDiscoverCountries
            ? 'No more cards today. Come back tomorrow!'
            : 'No more cards today. Discover new countries in Classic Mode.'}
        </p>
      ) : showNewCountryWarning ? (
        <div className="flashcards-view__warning">
          <p>{NEW_COUNTRY_WARNING}</p>
          <button
            type="button"
            className="flashcards-view__discover"
            onClick={() => {
              setNewCountryWarningDismissed(true)
              // The user has just chosen to discover it, so go straight to its card.
              setDiscoveryScreenPassedFor(currentCode)
            }}
          >
            Discover a new country anyway →
          </button>
        </div>
      ) : showDiscoveryScreen ? (
        <div className="flashcards-view__discovering">
          <p>Discovering a new country...</p>
          <button
            type="button"
            className="flashcards-view__go"
            onClick={() => setDiscoveryScreenPassedFor(currentCode)}
          >
            Go →
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
