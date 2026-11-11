import { lazy, Suspense, useEffect, useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { loadClassicCardCount, saveClassicCardCount } from '../../shared/classicCardCount'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import type { CountryIcon } from '../../shared/settings'
import { loadLearningGroup, saveLearningGroup } from '../../shared/learningGroup'
import { loadProgress, saveProgress } from '../../shared/progress'
import {
  isClassicPlayedToday,
  recentCountryCodes,
  recordPlayedCountry,
} from '../../shared/recentCountries'
import { logReview } from '../../shared/reviewLog'
import {
  clearUnfinishedCard,
  loadUnfinishedCard,
  saveUnfinishedCard,
  type UnfinishedCard,
} from '../../shared/unfinishedCard'
import {
  collectedCountries,
  groupProgressLabel,
  isNextCardNewCountry,
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
import { SeeOnGlobeButton, SeeOnGlobeScreen, useSeeOnGlobe } from './SeeOnGlobe'
import './FlashcardsView.css'

// The globe (MapLibre + border data) is large, so it is loaded only when a new
// region must be chosen.
const RegionGlobe = lazy(() => import('../globe/RegionGlobe'))

// A multi-country question comes after every this many finished cards (after
// the card's reward).
const CARDS_PER_MULTI_COUNTRY_QUESTION = 2

type FlashcardsViewProps = {
  // Which questions to ask: all 5 for Classic, or those ticked for custom practice.
  questionIds: QuestionId[]
  // The information chosen in Settings, which the familiarity reward's ring
  // covers (as on the Passport), even when only some of it is practiced.
  learnedQuestionIds: QuestionId[]
  // Which kinds of globe question may be asked, if the globe question is.
  globeKinds: GlobeKind[]
  // The multi-country questions mixed in between the cards: those offered for
  // the learned questions in Classic, or those ticked in Custom Practice.
  // Empty (the default) for none.
  multiCountryQuestionIds?: MultiCountryQuestionId[]
  // Classic discovers new countries, and saves its card and the count of
  // cards since the last multi-country question as they change, resuming
  // them when the screen is opened again the same day (unfinishedCard.ts,
  // classicCardCount.ts). Custom Practice only shows countries already in the
  // Passport, and starts afresh each time.
  mode: 'classic' | 'custom'
  // Whether each card shows the country's outline or flag, chosen in Settings.
  countryIcon: CountryIcon
  onBack: () => void
}

// The flashcards screen: shows one country's card at a time, endlessly, and
// saves progress after each answer. Only the questions in `questionIds` are
// asked. Each card is a random country from the Passport, the less familiar
// with the questions asked the likelier (`chooseRandomCountry`), never one of
// the last RECENT_COUNTRY_GAP countries played today on any flashcard screen
// (recentCountries.ts). In Classic, a new country comes instead for the first
// card of the day, when no Passport country may come, and otherwise by a
// weighted pick where a new country weighs NEW_COUNTRY_WEIGHT
// (`isNextCardNewCountry`). New countries come from
// the group of countries the user chose (learningGroup.ts) until all of them
// are in the Passport; then a globe of the regions (country groups) asks for
// the next one. In Custom Practice, when no Passport country may come, the
// screen says so and points to Classic. A country not yet in the Passport is
// introduced with a "Discovering a new country" screen before its card, and
// after its card a reward shows the Passport count going up. After the card of
// a country already in the Passport, a reward shows its familiarity instead.
// In Classic, a card left part-way is resumed the same day; on a later day, a
// new card is chosen as usual. With `multiCountryQuestionIds`, a multi-country
// question comes after every CARDS_PER_MULTI_COUNTRY_QUESTION cards, a random
// kind the Passport can make, but not the same kind as the one before unless
// it is the only one (`nextMultiCountryQuestion`). If the Passport can make
// none, it is skipped until another CARDS_PER_MULTI_COUNTRY_QUESTION cards are
// finished. Classic left before a due one is answered asks it first when
// opened again the same day.
export function FlashcardsView({
  questionIds,
  learnedQuestionIds,
  globeKinds,
  multiCountryQuestionIds = [],
  mode,
  countryIcon,
  onBack,
}: FlashcardsViewProps) {
  const canDiscoverCountries = mode === 'classic'
  // Fixed while the screen is open, so a session past midnight stays consistent.
  const [today] = useState(todayString)
  const [progress, setProgress] = useState<DeckProgress>(loadProgress)

  // The group new countries come from, while some of its countries aren't in
  // the Passport yet. Null in Custom Practice, or when a group must be chosen.
  const [groupId, setGroupId] = useState<string | null>(() =>
    canDiscoverCountries ? pendingGroupId(loadLearningGroup(), progress) : null,
  )

  // The next country: in Classic, a new one from the pending group when
  // `isNextCardNewCountry`, otherwise a random one from the Passport not played
  // recently. A Passport country can still be asked a question for the first
  // time. Null in Classic when a new group must be chosen first (the only way
  // Classic has no card, as with every country in the Passport there are more
  // than RECENT_COUNTRY_GAP to choose from), and in Custom Practice when no
  // Passport country may come.
  function nextCountry(progress: DeckProgress, groupId: string | null): string | null {
    const recentCodes = recentCountryCodes(today)
    const allowedCodes = collectedCountries(progress)
      .map((country) => country.isoAlpha3)
      .filter((code) => !recentCodes.includes(code))
    if (
      canDiscoverCountries &&
      isNextCardNewCountry(progress, isClassicPlayedToday(today), allowedCodes, questionIds, today)
    ) {
      return groupId === null ? null : randomUnseenCountryInGroup(progress, groupId)
    }
    return chooseRandomCountry(allowedCodes, progress, today, questionIds)
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
  // to ask, and its country is still in the Passport unless it was new. A card
  // with nothing answered yet also needs its country not played recently: it
  // was chosen when the card before it finished, so if it is in the list it
  // was played since (e.g. on its Passport card) and would come again straight
  // away. A card with answers always carries on, as those put it in the list.
  function canResume(saved: UnfinishedCard): boolean {
    return (
      saved.date === today &&
      questionIds.some((id) => !saved.answeredIds.includes(id)) &&
      (saved.isNewCountry || Object.keys(progress[saved.country] ?? {}).length > 0) &&
      (saved.answeredIds.length > 0 || !recentCountryCodes(today).includes(saved.country))
    )
  }

  // The card being shown, or null when there is no card to show.
  const [card, setCard] = useState<UnfinishedCard | null>(() => {
    const saved = mode === 'classic' ? loadUnfinishedCard() : null
    if (saved !== null && canResume(saved)) return saved
    return newCard(nextCountry(progress, groupId), progress)
  })
  const currentCode = card?.country ?? null

  // Keeps the saved card in step with the one shown, so leaving at any point
  // resumes it.
  useEffect(() => {
    if (mode !== 'classic') return
    if (card === null) clearUnfinishedCard()
    else saveUnfinishedCard(card)
  }, [card, mode])

  // The country whose "Discovering a new country" screen has been passed, by
  // "Go →".
  const [discoveryScreenPassedFor, setDiscoveryScreenPassedFor] = useState<string | null>(null)
  // Set after each card, until "Next →" moves on to the next card: the
  // Passport count for a new country's first card, otherwise its familiarity.
  const [reward, setReward] = useState<CardRewardDetails | null>(null)

  // Whether a multi-country question is due after `cardCount` finished cards.
  function isMultiCountryQuestionDue(cardCount: number): boolean {
    return multiCountryQuestionIds.length > 0 && cardCount >= CARDS_PER_MULTI_COUNTRY_QUESTION
  }

  // A multi-country question that the Passport in `progress` can make, not
  // the same kind as `previous` unless it is the only one. Null if it can make
  // none.
  function newMultiCountryQuestion(
    progress: DeckProgress,
    previous: MultiCountryQuestion | null,
  ): MultiCountryQuestion | null {
    const passportCodes = collectedCountries(progress).map((country) => country.isoAlpha3)
    return nextMultiCountryQuestion(multiCountryQuestionIds, passportCodes, previous)
  }

  // Cards finished since the last multi-country question was answered (or
  // was due but the Passport couldn't make any). Stays at its due value until
  // the question is answered, so a Classic screen left before then asks it
  // when opened again.
  const [cardsSinceMultiCountryQuestion, setCardsSinceMultiCountryQuestion] = useState(() =>
    mode === 'classic' ? loadClassicCardCount(today) : 0,
  )
  useEffect(() => {
    if (mode === 'classic') saveClassicCardCount(cardsSinceMultiCountryQuestion, today)
  }, [cardsSinceMultiCountryQuestion, mode, today])
  // The last multi-country question asked, kept after it is answered so the
  // next one isn't the same kind. Chosen on opening if one was already due.
  const [multiCountryQuestion, setMultiCountryQuestion] = useState<MultiCountryQuestion | null>(
    () =>
      isMultiCountryQuestionDue(cardsSinceMultiCountryQuestion)
        ? newMultiCountryQuestion(progress, null)
        : null,
  )
  // Shown once any reward before it is dismissed.
  const [isMultiCountryQuestionShown, setIsMultiCountryQuestionShown] = useState(
    multiCountryQuestion !== null,
  )

  // In Classic, when a new country should come but no group is pending
  // (`nextCountry` gave no card): the user chooses the next group. A resumed
  // card is finished first, even if its group has since been completed.
  const needsNewGroup = canDiscoverCountries && card === null
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
    recordPlayedCountry(code, today, mode === 'classic')
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
    const cardCount = cardsSinceMultiCountryQuestion + 1
    if (isMultiCountryQuestionDue(cardCount)) {
      const question = newMultiCountryQuestion(newProgress, multiCountryQuestion)
      if (question === null) {
        // Counted again from here, so the next try is another
        // CARDS_PER_MULTI_COUNTRY_QUESTION cards away.
        setCardsSinceMultiCountryQuestion(0)
      } else {
        setCardsSinceMultiCountryQuestion(cardCount)
        setMultiCountryQuestion(question)
        setIsMultiCountryQuestionShown(true)
      }
    } else {
      setCardsSinceMultiCountryQuestion(cardCount)
    }
    // Null once the group's last country is in the Passport, so the user
    // chooses the next group.
    const newGroupId = groupId === null ? null : pendingGroupId(groupId, newProgress)
    setGroupId(newGroupId)
    setCard(newCard(nextCountry(newProgress, newGroupId), newProgress))
  }

  function finishMultiCountryQuestion() {
    setIsMultiCountryQuestionShown(false)
    setCardsSinceMultiCountryQuestion(0)
  }

  // Saved straight away, so the group is still pending if the user leaves
  // before finishing it. The globe was shown because a new country should
  // come, so its first one comes straight away (without choosing again, which
  // could give a Passport country).
  function chooseGroup(newGroupId: string) {
    saveLearningGroup(newGroupId)
    setGroupId(newGroupId)
    setCard(newCard(randomUnseenCountryInGroup(progress, newGroupId), progress))
  }

  const seeOnGlobe = useSeeOnGlobe()
  // The country "See on Globe" shows: the finished card's on its reward, or
  // the card being asked. None on the other screens (multi-country questions,
  // the region globe, the discovery screen).
  const seeOnGlobeCode =
    reward !== null
      ? reward.code
      : (isMultiCountryQuestionShown && multiCountryQuestion !== null) ||
          card === null ||
          showDiscoveryScreen
        ? null
        : card.country

  return (
    <>
      {seeOnGlobe.code !== null && <SeeOnGlobeScreen code={seeOnGlobe.code} />}
      {/* Kept mounted under the globe, so the card is as it was left. */}
      <div className="flashcards-view" hidden={seeOnGlobe.code !== null}>
        <BackButton onClick={onBack} />
        {seeOnGlobeCode !== null && (
          <SeeOnGlobeButton onClick={() => seeOnGlobe.open(seeOnGlobeCode)} />
        )}
        {reward !== null ? (
          <CardReward
            reward={reward}
            continueLabel="Next"
            continueHasArrow={true}
            onContinue={() => setReward(null)}
          />
        ) : isMultiCountryQuestionShown && multiCountryQuestion !== null ? (
          <MultiCountryCard
            question={multiCountryQuestion}
            countryIcon={countryIcon}
            onFinish={finishMultiCountryQuestion}
          />
        ) : needsNewGroup ? (
          <Suspense fallback={<p className="flashcards-view__done">Loading globe…</p>}>
            <RegionGlobe progress={progress} onDiscover={chooseGroup} />
          </Suspense>
        ) : card === null ? (
          // Only in Custom Practice, when no Passport country may come.
          <p className="flashcards-view__done">
            {collectedCountries(progress).length === 0
              ? 'No countries in your Passport yet. Discover new countries in Classic Mode.'
              : "You've practiced all your Passport countries recently. Discover new countries in Classic Mode."}
          </p>
        ) : showDiscoveryScreen ? (
          <div className="flashcards-view__discovering">
            <p>
              Discovering a new country from {countryFacts[card.country].groupName}{' '}
              <span className="flashcards-view__no-wrap">
                {groupProgressLabel(countryFacts[card.country].groupId, progress)}...
              </span>
            </p>
            <p className="flashcards-view__discovering-subtitle">
              Just try your best guess
              <br />
              for these questions
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
    </>
  )
}
