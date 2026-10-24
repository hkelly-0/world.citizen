import { countryFacts } from '../../shared/countryFacts'
import { describe, expect, it } from 'vitest'
import {
  COUNTRY_COUNT,
  countryRecall,
  isTooUnfamiliarForNewCountry,
  unseenCountriesInGroup,
} from '../passport/passport'
import { countryDueDate, QUESTION_IDS, type DeckProgress } from '../flashcards/deck'
import { reviewQuestion } from '../flashcards/fsrs'
import {
  addCountries,
  makeAllDueToday,
  makeNothingDueToday,
  skipAheadDays,
  unseenCountriesInRandomGroups,
} from './devProgress'

const TODAY = '2026-10-23'

// France's capital answered right on 2026-10-20, Japan's area wrong today.
function sampleProgress(): DeckProgress {
  return {
    FRA: { capital: reviewQuestion(undefined, 'right', '2026-10-20') },
    JPN: { area: reviewQuestion(undefined, 'wrong', TODAY) },
  }
}

describe('skipAheadDays', () => {
  it('moves every review and due date back by the days skipped', () => {
    const progress = sampleProgress()
    const skipped = skipAheadDays(progress, 7)

    expect(skipped.FRA.capital!.lastReview).toBe('2026-10-13')
    expect(skipped.JPN.area!.lastReview).toBe('2026-10-16')
    expect(skipped.JPN.area!.dueDate).toBe('2026-10-17')
    // The original is unchanged.
    expect(progress.JPN.area!.lastReview).toBe(TODAY)
  })
})

describe('makeAllDueToday', () => {
  it('makes every answered question due today', () => {
    const due = makeAllDueToday(sampleProgress(), TODAY)

    expect(due.FRA.capital!.dueDate).toBe(TODAY)
    expect(due.JPN.area!.dueDate).toBe(TODAY)
    expect(due.FRA.area).toBeUndefined()
  })
})

describe('makeNothingDueToday', () => {
  it('moves questions due today or earlier to tomorrow and leaves later ones', () => {
    const progress = makeAllDueToday(sampleProgress(), TODAY)
    progress.JPN.area!.dueDate = '2026-11-01'
    const notDue = makeNothingDueToday(progress, TODAY)

    expect(notDue.FRA.capital!.dueDate).toBe('2026-10-24')
    expect(notDue.JPN.area!.dueDate).toBe('2026-11-01')
  })
})

describe('unseenCountriesInRandomGroups', () => {
  it('picks every unseen country of 3 different unfinished groups', () => {
    const progress = sampleProgress()
    const codes = unseenCountriesInRandomGroups(progress, 3)

    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).not.toContain('FRA')
    expect(codes).not.toContain('JPN')
    const groupIds = new Set(codes.map((code) => countryFacts[code].groupId))
    expect(groupIds.size).toBe(3)
    for (const groupId of groupIds) {
      expect(codes).toEqual(expect.arrayContaining(unseenCountriesInGroup(groupId, progress)))
    }
  })

  it('picks only as many groups as are left', () => {
    expect(unseenCountriesInRandomGroups(sampleProgress(), 1000)).toHaveLength(COUNTRY_COUNT - 2)
  })
})

describe('addCountries', () => {
  it('adds well-known countries that are familiar and not due', () => {
    const progress = addCountries({}, ['DEU', 'ITA'], 'well-known', TODAY)

    for (const code of ['DEU', 'ITA']) {
      expect(Object.keys(progress[code])).toEqual(QUESTION_IDS)
      expect(countryDueDate(progress[code], QUESTION_IDS)! > TODAY).toBe(true)
      expect(countryRecall(progress[code], QUESTION_IDS, TODAY)!).toBeGreaterThan(0.8)
    }
    expect(isTooUnfamiliarForNewCountry(progress, QUESTION_IDS, TODAY)).toBe(false)
  })

  it('adds shaky countries that are overdue and bring up the new-country warning', () => {
    // Enough countries (12) for the warning to apply.
    const codes = Object.keys(countryFacts).slice(0, 12)
    const progress = addCountries({}, codes, 'shaky', TODAY)

    expect(countryDueDate(progress[codes[0]], QUESTION_IDS)! < TODAY).toBe(true)
    expect(isTooUnfamiliarForNewCountry(progress, QUESTION_IDS, TODAY)).toBe(true)
  })

  it('keeps the progress already there', () => {
    const progress = addCountries(sampleProgress(), ['DEU'], 'shaky', TODAY)

    expect(progress.FRA).toEqual(sampleProgress().FRA)
  })
})
