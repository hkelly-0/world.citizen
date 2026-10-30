import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { countryRecall } from './familiarity'
import type { DeckProgress } from './deck'
import { rewardAfterCard } from './rewardAfterCard'

const answered = {
  stability: 10,
  difficulty: 5,
  reps: 1,
  lapses: 0,
  state: State.Review,
  lastReview: '2026-01-01',
}
const TODAY = '2026-02-01'

describe('rewardAfterCard', () => {
  it("shows the Passport count for a country's first card", () => {
    const after: DeckProgress = { PER: { area: answered }, FRA: { area: answered } }

    expect(rewardAfterCard('FRA', true, after, ['area'], TODAY)).toEqual({
      kind: 'new-country',
      code: 'FRA',
      countBefore: 1,
    })
  })

  it('shows the familiarity, for the learned questions, of a country already seen', () => {
    // Only the area was practised, but the capital is learned too.
    const after: DeckProgress = { FRA: { capital: answered, area: answered } }

    expect(rewardAfterCard('FRA', false, after, ['area', 'capital'], TODAY)).toEqual({
      kind: 'familiarity',
      code: 'FRA',
      recall: countryRecall(after.FRA, ['area', 'capital'], TODAY),
    })
  })
})
