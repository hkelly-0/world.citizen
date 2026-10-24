import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { QUESTION_IDS } from './deck'
import { countryRecall } from './familiarity'
import { recallChance } from './fsrs'

const answered = {
  stability: 10,
  difficulty: 5,
  reps: 1,
  lapses: 0,
  state: State.Review,
  lastReview: '2026-01-01',
}
const TODAY = '2026-02-01'

describe('countryRecall', () => {
  // A higher stability is remembered for longer, so has a higher recall chance.
  const withStability = (stability: number) => ({ ...answered, stability })

  it('averages the recall chances in 14 days of the answered questions given', () => {
    const country = { globe: withStability(5), area: withStability(50), capital: withStability(1) }
    const inFourteenDays = addDays(TODAY, 14)
    const expected =
      (recallChance(country.globe, inFourteenDays) + recallChance(country.area, inFourteenDays)) / 2
    expect(countryRecall(country, ['globe', 'area', 'population'], TODAY)).toBeCloseTo(expected)
  })

  it('is well below full for a question answered wrong today', () => {
    const wrongToday = {
      ...answered,
      stability: 0.2,
      lastReview: TODAY,
    }
    expect(countryRecall({ globe: wrongToday }, ['globe'], TODAY)).toBeLessThan(0.6)
  })

  it('is null when none of the questions given has been answered', () => {
    expect(countryRecall({ capital: withStability(5) }, ['globe'], TODAY)).toBeNull()
    expect(countryRecall(undefined, QUESTION_IDS, TODAY)).toBeNull()
  })
})
