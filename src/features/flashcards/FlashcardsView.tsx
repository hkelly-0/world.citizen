import { lazy, Suspense, useEffect, useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import type { CountryIcon } from '../../shared/settings'
import { loadLearningGroup, saveLearningGroup } from '../../shared/learningGroup'
import { loadProgress, saveProgress } from '../../shared/progress'
import { logReview } from '../../shared/reviewLog'
import {
  clearUnfinishedCard,
  loadUnfinishedCard,
  saveUnfinishedCard,
  type UnfinishedCard,
} from '../../shared/unfinishedCard'
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
  reviewAnswer,
  type DeckProgress,
  type GlobeKind,
  type QuestionId,
} from './deck'
import { flagOptions } from './flagQuestion'
import { Flashcard } from './Flashcard'
import { CardReward } from './CardReward'
import type { AnswerResult } from './fsrs'
import { MultiCountryCard } from './MultiCountryCard'
import {
  nextMultiCountryQuestion,
  type MultiCountryQuestion,
  type MultiCountryQuestionId,
} from './multiCountryQuestions'
import { rewardAfterCard, type CardRewardDetails } from './rewardAfterCard'
import './FlashcardsView.css'

// The globe (MapLibre + border data) is large, so it is loaded only when a new
// region must be chosen.
const RegionGlobe = lazy(() => import('../globe/RegionGlobe'))

// With multi-country questions ticked in Custom Practice, one comes after
// every this many finished cards (after the card's reward).
const CARDS_PER_MULTI_COUNTRY_QUESTION = 2

type FlashcardsViewProps = {
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // The information chosen in Settings, which the familiarity reward's ring
  // covers (as on the Passport), even when only some of it is practised.
  learnedQuestionIds: QuestionId[]
  // Which kinds of globe question may be asked, if the globe question is.
  globeKinds: GlobeKind[]
  // The multi-country questions ticked in Custom Practice, mixed in between
  // the cards. Empty (the default) for Classic.
  multiCountryQuestionIds?: MultiCountryQuestionId[]
  // True for Classic. False for Custom Practice, which only shows countries
  // already in the Passport, so new countries are only discovered in Classic.
  canDiscoverCountries: boolean
  // True for Classic: its card is saved as it changes, and resumed when the
  // screen is opened again the same day (unfinishedCard.ts).
  resumesUnfinishedCard: boolean
  // Whether each card shows the country's outline or flag, chosen in Settings.
  countryIcon: CountryIcon
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, endlessly, and
// saves progress after each answer. Only the questions in `questionIds` are
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
// With `resumesUnfinishedCard`, a card left part-way is resumed the same day;
// on a later day, a new card is chosen as usual. With `multiCountryQuestionIds`,
// a multi-country question comes after every CARDS_PER_MULTI_COUNTRY_QUESTION
// cards, a random ticked kind, but not the same kind as the one before unless
// it is the only one (`nextMultiCountryQuestion`).
export function FlashcardsView({
  questionIds,
  learnedQuestionIds,
  globeKinds,
  multiCountryQuestionIds = [],
  canDiscoverCountries,
  resumesUnfinishedCard,
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

  // The next country: a new one from the pending group when
  // `wantsNewCountry`, otherwise a random one from the Passport other than
  // `previousCode`. A Passport country can still be asked a question for the
  // first time. Null when a new group must be chosen first, or in Custom
  // Practice when the Passport is empty.
  function nextCountry(
    progress: DeckProgress,
    groupId: string | null,
    previousCode: string | null,
  ): string | null {
    if (wantsNewCountry(progress)) {
      return groupId === null ? null : randomUnseenCountryInGroup(progress, groupId)
    }
    const codes = collectedCountries(progress).map((country) => country.isoAlpha3)
    return chooseRandomCountry(codes, progress, today, questionIds, previousCode)
  }

  // A new card for `code`, with its globe kind (at random if both kinds are
  // allowed) and flag options chosen now. Null when `code` is.
  function newCard(code: string | null, progress: DeckProgress): UnfinishedCard | null {
    if (code === null) return null
    return {
      date: today,
      country: code,
      isNewCountry: Object.keys(progress[code] ?? {}).length === 0,
      isNameQuestion: globeKinds.length === 1 ? globeKinds[0] === 'name' : Math.random() < 0.5,
      offeredFlags: flagOptions(code),
      answeredIds: [],
    }
  }

  // Whether a saved card can carry on: it is from today, has a question left
  // to ask, and its country is still in the Passport unless it was new.
  function canResume(saved: UnfinishedCard): boolean {
    return (
      saved.date === today &&
      questionIds.some((id) => !saved.answeredIds.includes(id)) &&
      (saved.isNewCountry || Object.keys(progress[saved.country] ?? {}).length > 0)
    )
  }

  // The card being shown, or null when there is no card to show.
  const [card, setCard] = useState<UnfinishedCard | null>(() => {
    const saved = resumesUnfinishedCard ? loadUnfinishedCard() : null
    if (saved !== null && canResume(saved)) return saved
    return newCard(nextCountry(progress, groupId, null), progress)
  })
  const currentCode = card?.country ?? null

  // Keeps the saved card in step with the one shown, so leaving at any point
  // resumes it.
  useEffect(() => {
    if (!resumesUnfinishedCard) return
    if (card === null) clearUnfinishedCard()
    else saveUnfinishedCard(card)
  }, [card, resumesUnfinishedCard])

  // The country whose "Discovering a new country" screen has been passed, by
  // "Go →".
  const [discoveryScreenPassedFor, setDiscoveryScreenPassedFor] = useState<string | null>(null)
  // Set after each card, until "Next →" moves on to the next card: the
  // Passport count for a new country's first card, otherwise its familiarity.
  const [reward, setReward] = useState<CardRewardDetails | null>(null)

  // Cards finished since the last multi-country question.
  const [cardsSinceMultiCountryQuestion, setCardsSinceMultiCountryQuestion] = useState(0)
  // The last multi-country question asked, kept after it is answered so the
  // next one isn't the same kind.
  const [multiCountryQuestion, setMultiCountryQuestion] = useState<MultiCountryQuestion | null>(
    null,
  )
  const [isMultiCountryQuestionShown, setIsMultiCountryQuestionShown] = useState(false)

  // In Classic, when a new country should come but no group is pending: the
  // user chooses the next group. A resumed card is finished first, even if
  // its group has since been completed.
  const needsNewGroup = card === null && wantsNewCountry(progress) && groupId === null
  // Not yet in the Passport: no question answered, including ones not asked.
  const currentIsUndiscovered =
    currentCode !== null && Object.keys(progress[currentCode] ?? {}).length === 0
  const showDiscoveryScreen =
    canDiscoverCountries && currentIsUndiscovered && discoveryScreenPassedFor !== currentCode

  // Saved straight away: the question's FSRS review and the review log
  // entry. A new country joins the Passport, and is discovered, at its first
  // answer.
  function answerQuestion(
    card: UnfinishedCard,
    id: QuestionId,
    result: AnswerResult,
    isCardFinished: boolean,
  ) {
    const code = card.country
    if (Object.keys(progress[code] ?? {}).length === 0) recordDiscovery(code, new Date())
    const newProgress = reviewAnswer(progress, code, id, result, today)
    setProgress(newProgress)
    saveProgress(newProgress)
    logReview(code, id, result, today)
    if (isCardFinished) {
      // Passed the new progress, as `progress` doesn't update until the next render.
      finishCard(card, newProgress)
    } else {
      setCard({ ...card, answeredIds: [...card.answeredIds, id] })
    }
  }

  // The answers are already saved; this shows the reward and picks the next card.
  function finishCard(card: UnfinishedCard, newProgress: DeckProgress) {
    const code = card.country
    setReward(rewardAfterCard(code, card.isNewCountry, newProgress, learnedQuestionIds, today))
    setCardsSinceMultiCountryQuestion(cardsSinceMultiCountryQuestion + 1)
    // Null once the group's last country is in the Passport, so the user
    // chooses the next group.
    const newGroupId = groupId === null ? null : pendingGroupId(groupId, newProgress)
    setGroupId(newGroupId)
    setCard(newCard(nextCountry(newProgress, newGroupId, code), newProgress))
  }

  // Leaves the reward: for a multi-country question if one is due, otherwise
  // for the next card.
  function continueAfterReward() {
    setReward(null)
    const isDue =
      multiCountryQuestionIds.length > 0 &&
      cardsSinceMultiCountryQuestion >= CARDS_PER_MULTI_COUNTRY_QUESTION
    if (!isDue) return
    // Custom Practice can't discover countries, so the Passport is the same
    // one the menu checked each ticked kind could be made from.
    const passportCodes = collectedCountries(progress).map((country) => country.isoAlpha3)
    const question = nextMultiCountryQuestion(
      multiCountryQuestionIds,
      passportCodes,
      multiCountryQuestion,
    )
    if (question === null) return
    setMultiCountryQuestion(question)
    setIsMultiCountryQuestionShown(true)
    setCardsSinceMultiCountryQuestion(0)
  }

  // Saved straight away, so the group is still pending if the user leaves
  // before finishing it.
  function chooseGroup(newGroupId: string) {
    saveLearningGroup(newGroupId)
    setGroupId(newGroupId)
    setCard(newCard(nextCountry(progress, newGroupId, null), progress))
  }

  return (
    <div className="flashcards-view">
      <BackButton onClick={onBack} />
      {reward !== null ? (
        <CardReward
          reward={reward}
          continueLabel="Next"
          continueHasArrow={true}
          onContinue={continueAfterReward}
        />
      ) : isMultiCountryQuestionShown && multiCountryQuestion !== null ? (
        <MultiCountryCard
          question={multiCountryQuestion}
          countryIcon={countryIcon}
          onFinish={() => setIsMultiCountryQuestionShown(false)}
        />
      ) : needsNewGroup ? (
        <Suspense fallback={<p className="flashcards-view__done">Loading globe…</p>}>
          <RegionGlobe progress={progress} onDiscover={chooseGroup} />
        </Suspense>
      ) : card === null ? (
        // Only in Custom Practice, with the Passport empty.
        <p className="flashcards-view__done">
          No countries in your Passport yet. Discover new countries in Classic Mode.
        </p>
      ) : showDiscoveryScreen ? (
        <div className="flashcards-view__discovering">
          <p>
            Discovering a new country from {countryFacts[card.country].groupName}{' '}
            {groupProgressLabel(countryFacts[card.country].groupId, progress)}...
          </p>
          <button
            type="button"
            className="flashcards-view__go arrow-button"
            onClick={() => setDiscoveryScreenPassedFor(card.country)}
          >
            Go
          </button>
        </div>
      ) : (
        // The key gives each country a fresh card, resetting its answers.
        <Flashcard
          key={card.country}
          country={countryFacts[card.country]}
          questionIds={questionIds}
          isNameQuestion={card.isNameQuestion}
          offeredFlags={card.offeredFlags}
          answeredIds={card.answeredIds}
          countryIcon={countryIcon}
          progress={progress[card.country]}
          onAnswer={(id, result, isCardFinished) =>
            answerQuestion(card, id, result, isCardFinished)
          }
          onFinish={() => finishCard(card, progress)}
        />
      )}
    </div>
  )
}
