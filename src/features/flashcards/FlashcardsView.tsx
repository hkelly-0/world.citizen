import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadLearningGroup, saveLearningGroup } from '../../shared/learningGroup'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import {
  collectedCountries,
  COUNTRY_COUNT,
  groupProgressLabel,
  isTooUnfamiliarForNewCountry,
  NEW_COUNTRY_WARNING,
  pendingGroupId,
  unseenCountriesInGroup,
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
import { CardReward } from './CardReward'
import { GroupChooser } from './GroupChooser'
import type { AnswerResult } from './fsrs'
import { rewardAfterCard, type CardRewardDetails } from './rewardAfterCard'
import './FlashcardsView.css'

type FlashcardsViewProps = {
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // The information chosen in Settings, which the familiarity reward's ring
  // covers (as on the Passport), even when only some of it is practised.
  learnedQuestionIds: QuestionId[]
  // Which kinds of globe question may be asked, if the globe question is.
  globeKinds: GlobeKind[]
  // True for Classic. False for Custom Practice, which only shows countries
  // already in the Passport, so new countries are only discovered in Classic.
  canDiscoverCountries: boolean
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, chosen by FSRS,
// and saves progress after each card. Only the questions in `questionIds` are
// asked, and only they decide which countries are due. In Classic, new
// countries come from the group of countries the user chose (learningGroup.ts)
// until all of them are in the Passport; then a dropdown asks for the next
// group. Before a new country, or before that dropdown,
// it warns if the countries already seen aren't familiar enough yet, until the
// user chooses to go on (once per visit to the screen). Otherwise, a country
// not yet in the Passport is introduced with a "Discovering a new country"
// screen before its card, and after its card a reward shows the Passport count
// going up. After the card of a country already in the Passport, a reward
// shows its familiarity instead.
export function FlashcardsView({
  questionIds,
  learnedQuestionIds,
  globeKinds,
  canDiscoverCountries,
  onBack,
}: FlashcardsViewProps) {
  // Fixed while the screen is open, so a session past midnight stays consistent.
  const [today] = useState(todayString)
  const [progress, setProgress] = useState<DeckProgress>(loadProgress)

  // The group new countries come from, while some of its countries aren't in
  // the Passport yet. Null in Custom Practice, or when a group must be chosen.
  const [groupId, setGroupId] = useState<string | null>(() =>
    canDiscoverCountries ? pendingGroupId(loadLearningGroup(), progress) : null,
  )

  // The countries cards may come from: those in the Passport, plus in Classic
  // the chosen group's countries not yet in it. A Passport country can still
  // be asked a question for the first time.
  function cardCodes(progress: DeckProgress, groupId: string | null): string[] {
    const collectedCodes = collectedCountries(progress).map((country) => country.isoAlpha3)
    if (!canDiscoverCountries || groupId === null) return collectedCodes
    return [...collectedCodes, ...unseenCountriesInGroup(groupId, progress)]
  }

  // The country being shown, or null when there are no cards left today.
  const [currentCode, setCurrentCode] = useState<string | null>(() =>
    chooseNextCountry(cardCodes(progress, groupId), progress, today, questionIds),
  )
  // Set by "Discover a new country anyway →"; not shown again until the
  // screen is reopened.
  const [newCountryWarningDismissed, setNewCountryWarningDismissed] = useState(false)
  // The country whose "Discovering a new country" screen has been passed, by
  // "Go →" or by "Discover a new country anyway →".
  const [discoveryScreenPassedFor, setDiscoveryScreenPassedFor] = useState<string | null>(null)
  // Set after each card, until "Next →" moves on to the next card: the
  // Passport count for a new country's first card, otherwise its familiarity.
  const [reward, setReward] = useState<CardRewardDetails | null>(null)

  // New for the questions being asked: none of them answered yet.
  const currentIsNew =
    currentCode !== null && countryDueDate(progress[currentCode], questionIds) === null
  // In Classic, with nothing due and no group pending, while some country
  // isn't in the Passport yet: the user chooses the next group.
  const needsNewGroup =
    canDiscoverCountries &&
    currentCode === null &&
    groupId === null &&
    collectedCountries(progress).length < COUNTRY_COUNT
  // Only when the card could be a country not yet in the Passport, or before
  // choosing the group the next ones come from.
  const showNewCountryWarning =
    canDiscoverCountries &&
    (currentIsNew || needsNewGroup) &&
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
    const newReward = rewardAfterCard(code, progress, newProgress, learnedQuestionIds, today)
    // The country's first card: it has just joined the Passport.
    if (newReward.kind === 'new-country') recordDiscovery(code, new Date())
    setReward(newReward)
    // Null once the group's last country is in the Passport, so the user
    // chooses the next group.
    const newGroupId = groupId === null ? null : pendingGroupId(groupId, newProgress)
    setGroupId(newGroupId)
    setCurrentCode(
      chooseNextCountry(cardCodes(newProgress, newGroupId), newProgress, today, questionIds),
    )
  }

  // Saved straight away, so the group is still pending if the user leaves
  // before finishing it.
  function chooseGroup(newGroupId: string) {
    saveLearningGroup(newGroupId)
    setGroupId(newGroupId)
    setCurrentCode(chooseNextCountry(cardCodes(progress, newGroupId), progress, today, questionIds))
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {reward !== null ? (
        <CardReward reward={reward} continueLabel="Next →" onContinue={() => setReward(null)} />
      ) : showNewCountryWarning ? (
        <div className="flashcards-view__warning">
          <p>{NEW_COUNTRY_WARNING}</p>
          <button
            type="button"
            className="flashcards-view__discover"
            onClick={() => {
              setNewCountryWarningDismissed(true)
              // The user has just chosen to discover it, so go straight to its
              // card (or to the group dropdown, if no group is pending).
              setDiscoveryScreenPassedFor(currentCode)
            }}
          >
            Discover a new country anyway →
          </button>
        </div>
      ) : needsNewGroup ? (
        <div className="flashcards-view__choose-group">
          <p>Choose a group of countries to learn.</p>
          <GroupChooser
            progress={progress}
            buttonLabel="Go →"
            buttonClassName="flashcards-view__go"
            onChoose={chooseGroup}
          />
        </div>
      ) : currentCode === null ? (
        <p className="flashcards-view__done">
          {canDiscoverCountries
            ? 'No more cards today. Come back tomorrow!'
            : 'No more cards today. Discover new countries in Classic Mode.'}
        </p>
      ) : showDiscoveryScreen ? (
        <div className="flashcards-view__discovering">
          <p>
            Discovering a new country from {countryFacts[currentCode].groupName}{' '}
            {groupProgressLabel(countryFacts[currentCode].groupId, progress)}...
          </p>
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
