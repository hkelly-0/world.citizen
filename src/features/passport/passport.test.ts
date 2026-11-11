import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { QUESTION_IDS, type DeckProgress } from '../flashcards/deck'
import {
  collectedCountries,
  COUNTRY_COUNT,
  groupProgressLabel,
  groupsToChoose,
  isNextCardNewCountry,
  NEW_COUNTRY_WEIGHT,
  isTooUnfamiliarForNewCountry,
  pendingGroupId,
  randomUnseenCountryInGroup,
  sortedCollectedCountries,
  unseenCountriesInGroup,
} from './passport'

const answered = {
  stability: 10,
  difficulty: 5,
  reps: 1,
  lapses: 0,
  state: State.Review,
  lastReview: '2026-01-01',
}
const TODAY = '2026-02-01'

// The Nordic Countries group is DNK, NOR, SWE, FIN (countryGroups.json).
describe('unseenCountriesInGroup', () => {
  it("lists the group's countries with no question answered, in file order", () => {
    // Sweden has an entry but nothing answered, so it is still unseen.
    const progress: DeckProgress = { NOR: { globe: answered }, SWE: {} }
    expect(unseenCountriesInGroup('nordic', progress)).toEqual(['DNK', 'SWE', 'FIN'])
  })

  it('is empty for an unknown group', () => {
    expect(unseenCountriesInGroup('atlantis', {})).toEqual([])
  })
})

describe('pendingGroupId', () => {
  it('keeps the saved group while some of its countries are unseen', () => {
    expect(pendingGroupId('nordic', { NOR: { globe: answered } })).toBe('nordic')
  })

  it('is null once every country of the group is seen, or with nothing saved', () => {
    const progress = Object.fromEntries(
      ['DNK', 'NOR', 'SWE', 'FIN'].map((code) => [code, { globe: answered }]),
    )
    expect(pendingGroupId('nordic', progress)).toBeNull()
    expect(pendingGroupId(null, {})).toBeNull()
  })
})

describe('groupsToChoose', () => {
  it('lists the groups with unseen countries A-Z, counting the seen ones', () => {
    const progress = Object.fromEntries(
      ['DNK', 'NOR', 'SWE', 'FIN', 'EST'].map((code) => [code, { globe: answered }]),
    )
    const choices = groupsToChoose(progress)
    expect(choices.find((choice) => choice.id === 'nordic')).toBeUndefined()
    expect(choices.find((choice) => choice.id === 'baltic-states')).toEqual({
      id: 'baltic-states',
      name: 'Baltic States',
      seenCount: 1,
      size: 3,
    })
    const names = choices.map((choice) => choice.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    expect(choices.length).toBe(50)
  })
})

describe('groupProgressLabel', () => {
  it('says where the next new country comes in the group', () => {
    expect(groupProgressLabel('nordic', {})).toBe('(1 of 4)')
    expect(groupProgressLabel('nordic', { NOR: { globe: answered } })).toBe('(2 of 4)')
  })
})

describe('randomUnseenCountryInGroup', () => {
  it("picks among the group's unseen countries", () => {
    const progress: DeckProgress = { DNK: { globe: answered }, NOR: { globe: answered } }
    expect(randomUnseenCountryInGroup(progress, 'nordic', () => 0)).toBe('SWE')
    expect(randomUnseenCountryInGroup(progress, 'nordic', () => 0.99)).toBe('FIN')
  })

  it('is null once every country of the group is collected', () => {
    const progress = Object.fromEntries(
      ['DNK', 'NOR', 'SWE', 'FIN'].map((code) => [code, { globe: answered }]),
    )
    expect(randomUnseenCountryInGroup(progress, 'nordic')).toBeNull()
  })
})

describe('collectedCountries', () => {
  it('is empty with no progress', () => {
    expect(collectedCountries({})).toEqual([])
  })

  it('lists countries with any question answered, alphabetically', () => {
    const progress = {
      PER: { capital: answered },
      FRA: { globe: answered, area: answered },
      AUT: {},
    }
    expect(collectedCountries(progress).map((country) => country.commonName)).toEqual([
      'France',
      'Peru',
    ])
  })

  it('leaves out codes that are not one of the 197', () => {
    expect(collectedCountries({ GRL: { globe: answered } })).toEqual([])
  })
})

describe('sortedCollectedCountries', () => {
  const progress = {
    PER: { capital: answered },
    FRA: { globe: answered },
    JPN: { area: answered },
    BRA: { area: answered },
    CHL: { area: answered },
  }
  const discoveries = {
    PER: '2026-10-20T09:00:00.000Z',
    FRA: '2026-10-22T08:00:00.000Z',
    JPN: '2026-10-20T08:00:00.000Z',
  }
  const names = (sort: 'alphabetical' | 'date-discovered') =>
    sortedCollectedCountries(progress, discoveries, QUESTION_IDS, sort, TODAY).map(
      (country) => country.commonName,
    )

  it('sorts alphabetically', () => {
    expect(names('alphabetical')).toEqual(['Brazil', 'Chile', 'France', 'Japan', 'Peru'])
  })

  it('sorts by date discovered, first discovered first, with undated countries before, A-Z', () => {
    expect(names('date-discovered')).toEqual(['Brazil', 'Chile', 'Japan', 'Peru', 'France'])
  })
})

describe('isNextCardNewCountry', () => {
  // The area is never answered, so each country weighs 1 for ['area'].
  const progress: DeckProgress = { FRA: { capital: answered }, DEU: { capital: answered } }
  const pick = (
    isClassicPlayedToday: boolean,
    allowedCodes: string[],
    random: number,
    deckProgress = progress,
  ) =>
    isNextCardNewCountry(
      deckProgress,
      isClassicPlayedToday,
      allowedCodes,
      ['area'],
      TODAY,
      () => random,
    )

  it("is always new for the day's first Classic card", () => {
    expect(pick(false, ['FRA'], 0.99)).toBe(true)
  })

  it('is always new when no Passport country may come', () => {
    expect(pick(true, [], 0.99)).toBe(true)
  })

  it('is otherwise one weighted pick, with a new country weighing NEW_COUNTRY_WEIGHT', () => {
    // Two allowed countries of weight 1 each.
    const newChance = NEW_COUNTRY_WEIGHT / (NEW_COUNTRY_WEIGHT + 2)
    expect(pick(true, ['FRA', 'DEU'], newChance - 0.01)).toBe(true)
    expect(pick(true, ['FRA', 'DEU'], newChance + 0.01)).toBe(false)
  })

  it('counts only the allowed Passport countries', () => {
    // DEU was played recently, so only FRA weighs against a new country.
    const newChance = NEW_COUNTRY_WEIGHT / (NEW_COUNTRY_WEIGHT + 1)
    expect(pick(true, ['FRA'], newChance - 0.01)).toBe(true)
  })

  it('is never new once every country is in the Passport', () => {
    const everyCountry: DeckProgress = Object.fromEntries(
      Object.keys(countryFacts).map((code) => [code, { area: answered }]),
    )
    expect(pick(false, [], 0, everyCountry)).toBe(false)
  })
})

describe('isTooUnfamiliarForNewCountry', () => {
  // Answered on TODAY: soon forgotten with a low stability, remembered with a high one.
  const answeredToday = (stability: number) => ({
    ...answered,
    stability,
    lastReview: TODAY,
  })

  // The first `count` countries, each with the globe question answered today.
  const seenCountries = (count: number, stability: number): DeckProgress =>
    Object.fromEntries(
      Object.keys(countryFacts)
        .slice(0, count)
        .map((code) => [code, { globe: answeredToday(stability) }]),
    )

  // The first 12 countries, the first `unfamiliarCount` soon forgotten and the
  // rest remembered.
  const mixedCountries = (unfamiliarCount: number): DeckProgress =>
    Object.fromEntries(
      Object.keys(countryFacts)
        .slice(0, 12)
        .map((code, i) => [code, { globe: answeredToday(i < unfamiliarCount ? 0.2 : 10000) }]),
    )

  it('is true when more than 3 Passport countries are below 75% in 14 days', () => {
    expect(isTooUnfamiliarForNewCountry(mixedCountries(4), ['globe'], TODAY)).toBe(true)
    expect(isTooUnfamiliarForNewCountry(mixedCountries(3), ['globe'], TODAY)).toBe(false)
    expect(isTooUnfamiliarForNewCountry(mixedCountries(0), ['globe'], TODAY)).toBe(false)
  })

  it('counts a country with none of the questions given answered as unfamiliar', () => {
    // Only capitals answered, but the globe question is being asked.
    const progress = Object.fromEntries(
      Object.keys(countryFacts)
        .slice(0, 12)
        .map((code) => [code, { capital: answeredToday(10000) }]),
    )
    expect(isTooUnfamiliarForNewCountry(progress, ['globe'], TODAY)).toBe(true)
  })

  it('is false until 12 countries are in the Passport', () => {
    expect(isTooUnfamiliarForNewCountry(seenCountries(11, 0.2), ['globe'], TODAY)).toBe(false)
  })

  it('is false when no country has been seen', () => {
    expect(isTooUnfamiliarForNewCountry({}, QUESTION_IDS, TODAY)).toBe(false)
  })
})

describe('sorting by recall', () => {
  const withStability = (stability: number) => ({ ...answered, stability })
  const progress = {
    PER: { globe: withStability(50) },
    FRA: { globe: withStability(1), area: withStability(20) },
    JPN: { globe: withStability(10) },
    BRA: { globe: withStability(50) },
    CHL: { capital: withStability(1) },
  }

  it('puts the least likely to be remembered first, ties A-Z, and countries with no learned question answered last', () => {
    const names = sortedCollectedCountries(progress, {}, ['globe', 'area'], 'recall', TODAY).map(
      (country) => country.commonName,
    )
    expect(names).toEqual(['France', 'Japan', 'Brazil', 'Peru', 'Chile'])
  })
})

describe('COUNTRY_COUNT', () => {
  it('is 197', () => {
    expect(COUNTRY_COUNT).toBe(197)
  })
})
