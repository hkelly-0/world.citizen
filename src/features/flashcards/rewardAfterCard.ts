import { collectedCountries, countryRecall } from '../passport/passport'
import type { DeckProgress, QuestionId } from './deck'

// The reward shown after every finished card (see `CardReward`).
export type CardRewardDetails =
  // A new country's first card: it has just joined the Passport, which had
  // `countBefore` countries.
  | { kind: 'new-country'; code: string; countBefore: number }
  // Any other card: the country's familiarity afterwards, as on the Passport.
  | { kind: 'familiarity'; code: string; recall: number | null }

// Which reward follows the card of `code`. A country is new when it had no
// question answered before this card, including ones not asked. The
// familiarity always covers the questions learned in Settings, even in Custom
// Practice, so it matches the country's ring on the Passport.
export function rewardAfterCard(
  code: string,
  progressBefore: DeckProgress,
  progressAfter: DeckProgress,
  learnedQuestionIds: QuestionId[],
  today: string,
): CardRewardDetails {
  if (Object.keys(progressBefore[code] ?? {}).length === 0) {
    return { kind: 'new-country', code, countBefore: collectedCountries(progressBefore).length }
  }
  return {
    kind: 'familiarity',
    code,
    recall: countryRecall(progressAfter[code], learnedQuestionIds, today),
  }
}
