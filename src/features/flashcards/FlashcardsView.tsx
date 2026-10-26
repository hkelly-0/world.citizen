import { lazy, Suspense, useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import type { CountryIcon } from '../../shared/settings'
import { loadLearningGroup, saveLearningGroup } from '../../shared/learningGroup'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logCardReviews } from '../../shared/reviewLog'
import {
  collectedCountries,
  COUNTRY_COUNT,
  groupProgressLabel,
  isTooUnfamiliarForNewCountry,
  pendingGroupId,
  randomUnseenCountryInGroup,
} from '../passport/passport'
import { todayString } from './dates'
import {
  chooseRandomCountry,
  reviewCountry,
  type DeckProgress,
  type GlobeKind,
  type QuestionId,
} from './deck'
import { Flashcard } from './Flashcard'
import { CardReward } from './CardReward'
import type { AnswerResult } from './fsrs'
import { rewardAfterCard, type CardRewardDetails } from './rewardAfterCard'
import './FlashcardsView.css'

// The globe (MapLibre + border data) is large, so it is loaded only when a new
// region must be chosen.
const RegionGlobe = lazy(() => import('../globe/RegionGlobe'))

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
  // Whether each card shows the country's outline or flag, chosen in Settings.
  countryIcon: CountryIcon
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, endlessly, and
// saves progress after each card. Only the questions in `questionIds` are
// asked. Each card is a random country from the Passport, the less familiar
// with the questions asked the likelier (`chooseRandomCountry`), never the
// same one twice in a row. In Classic, once the countries already seen are
// familiar enough (`isTooUnfamiliarForNewCountry` is false), a new country
// comes instead, from the group of countries the user chose (learningGroup.ts)
// until all of them are in the Passport; then a globe of the regions (country
// groups) asks for the next one. A country not yet in the Passport is
// introduced with a "Discovering a new country" screen before its card, and
// after its card a reward shows the Passport count going up. After the card of
// a country already in the Passport, a reward shows its familiarity instead.
export function FlashcardsView({
  questionIds,
  learnedQuestionIds,
  globeKinds,
  canDiscoverCountries,
  countryIcon,
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

  // Whether the next card should be a new country: in Classic, while some
  // country isn't in the Passport yet, once those seen are familiar enough.
  function wantsNewCountry(progress: DeckProgress): boolean {
    return (
      canDiscoverCountries &&
      collectedCountries(progress).length < COUNTRY_COUNT &&
      !isTooUnfamiliarForNewCountry(progress, questionIds, today)
    )
  }

  // The next card's country: a new one from the pending group when
  // `wantsNewCountry`, otherwise a random one from the Passport other than
  // `previousCode`. A Passport country can still be asked a question for the
  // first time. Null when a new group must be chosen first, or in Custom
  // Practice when the Passport is empty.
  function nextCard(
    progress: DeckProgress,
    groupId: string | null,
    previousCode: string | null,
  ): string | null {
    if (wantsNewCountry(progress)) {
      return groupId === null ? null : randomUnseenCountryInGroup(progress, groupId)
    }
    const collectedCodes = collectedCountries(progress).map((country) => country.isoAlpha3)
    return chooseRandomCountry(collectedCodes, progress, today, questionIds, previousCode)
  }

  // The country being shown, or null when there is no card to show.
  const [currentCode, setCurrentCode] = useState<string | null>(() =>
    nextCard(progress, groupId, null),
  )
  // The country whose "Discovering a new country" screen has been passed, by
  // "Go →".
  const [discoveryScreenPassedFor, setDiscoveryScreenPassedFor] = useState<string | null>(null)
  // Set after each card, until "Next →" moves on to the next card: the
  // Passport count for a new country's first card, otherwise its familiarity.
  const [reward, setReward] = useState<CardRewardDetails | null>(null)

  // In Classic, when a new country should come but no group is pending: the
  // user chooses the next group.
  const needsNewGroup = wantsNewCountry(progress) && groupId === null
  // Not yet in the Passport: no question answered, including ones not asked.
  const currentIsUndiscovered =
    currentCode !== null && Object.keys(progress[currentCode] ?? {}).length === 0
  const showDiscoveryScreen =
    canDiscoverCountries && currentIsUndiscovered && discoveryScreenPassedFor !== currentCode

  // Each asked question gets its own FSRS review. Questions not asked keep
  // their progress.
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
    setCurrentCode(nextCard(newProgress, newGroupId, code))
  }

  // Saved straight away, so the group is still pending if the user leaves
  // before finishing it.
  function chooseGroup(newGroupId: string) {
    saveLearningGroup(newGroupId)
    setGroupId(newGroupId)
    setCurrentCode(nextCard(progress, newGroupId, null))
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {reward !== null ? (
        <CardReward
          reward={reward}
          continueLabel="Next"
          continueHasArrow={true}
          onContinue={() => setReward(null)}
        />
      ) : needsNewGroup ? (
        <Suspense fallback={<p className="flashcards-view__done">Loading globe…</p>}>
          <RegionGlobe progress={progress} onDiscover={chooseGroup} />
        </Suspense>
      ) : currentCode === null ? (
        // Only in Custom Practice, with the Passport empty.
        <p className="flashcards-view__done">
          No countries in your Passport yet. Discover new countries in Classic Mode.
        </p>
      ) : showDiscoveryScreen ? (
        <div className="flashcards-view__discovering">
          <p>
            Discovering a new country from {countryFacts[currentCode].groupName}{' '}
            {groupProgressLabel(countryFacts[currentCode].groupId, progress)}...
          </p>
          <button
            type="button"
            className="flashcards-view__go arrow-button"
            onClick={() => setDiscoveryScreenPassedFor(currentCode)}
          >
            Go
          </button>
        </div>
      ) : (
        // The key gives each country a fresh card, resetting its answers.
        <Flashcard
          key={currentCode}
          country={countryFacts[currentCode]}
          questionIds={questionIds}
          globeKinds={globeKinds}
          countryIcon={countryIcon}
          onFinish={(results) => finishCard(currentCode, results)}
        />
      )}
    </div>
  )
}
