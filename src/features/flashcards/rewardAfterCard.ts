import { collectedCountries } from '../passport/passport'
import { countryRecall } from './familiarity'
import type { DeckProgress, QuestionId } from './deck'

// The reward shown after every finished card (see `CardReward`). `isPerfect`
// is whether every question on the card was answered right (not close), on a
// card of at least `MIN_ANSWERS_FOR_PERFECT` questions.
export type CardRewardDetails =
  // A new country's first card: it has just joined the Passport, which had
  // `countBefore` countries.
  | { kind: 'new-country'; code: string; isPerfect: boolean; countBefore: number }
  // Any other card: the country's familiarity afterwards, as on the Passport,
  // and before the card's first answer (null if it had none).
  | {
      kind: 'familiarity'
      code: string
      isPerfect: boolean
      recall: number | null
      recallBefore: number | null
    }

// A card of one question (possible in Custom Practice, or with every other
// question type unticked in Settings) is too easy to call "Perfect".
const MIN_ANSWERS_FOR_PERFECT = 2

// Which reward follows the card of `code`. A country is new when it had no
// question answered before this card, including ones not asked; it joined the
// Passport at the card's first answer, so is counted in `progressAfter`. The
// familiarity always covers the questions learned in Settings, even in Custom
// Practice, so it matches the country's ring on the Passport. `recallBefore`
// is worked out the same way, by the screen, before the card's first answer.
export function rewardAfterCard(
  code: string,
  isNewCountry: boolean,
  hasOnlyRightAnswers: boolean,
  answerCount: number,
  progressAfter: DeckProgress,
  recallBefore: number | null,
  learnedQuestionIds: QuestionId[],
  today: string,
): CardRewardDetails {
  const isPerfect = hasOnlyRightAnswers && answerCount >= MIN_ANSWERS_FOR_PERFECT
  if (isNewCountry) {
    return {
      kind: 'new-country',
      code,
      isPerfect,
      countBefore: collectedCountries(progressAfter).length - 1,
    }
  }
  return {
    kind: 'familiarity',
    code,
    isPerfect,
    recall: countryRecall(progressAfter[code], learnedQuestionIds, today),
    recallBefore,
  }
}
