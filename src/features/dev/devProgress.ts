import { COUNTRY_GROUPS } from '../../shared/countryFacts'
import { unseenCountriesInGroup } from '../passport/passport'
import { addDays } from '../flashcards/dates'
import { QUESTION_IDS, type CountryProgress, type DeckProgress } from '../flashcards/deck'
import { recallChance, reviewQuestion, type QuestionProgress } from '../flashcards/fsrs'

// Changes to saved flashcard progress for testing different situations, used
// by the dev menu (`DevTools.tsx`, dev server only). Each returns new
// progress and leaves the one passed in unchanged.

// Applies `change` to every answered question of every country.
function mapQuestions(
  progress: DeckProgress,
  change: (question: QuestionProgress) => QuestionProgress,
): DeckProgress {
  const result: DeckProgress = {}
  for (const [code, country] of Object.entries(progress)) {
    const newCountry: CountryProgress = {}
    for (const id of QUESTION_IDS) {
      const question = country[id]
      if (question !== undefined) newCountry[id] = change(question)
    }
    result[code] = newCountry
  }
  return result
}

// As if `days` days had passed: every review date moves that many days into
// the past, so familiarity drops.
export function skipAheadDays(progress: DeckProgress, days: number): DeckProgress {
  return mapQuestions(progress, (question) => ({
    ...question,
    lastReview: addDays(question.lastReview, -days),
  }))
}

// As if every answered question had last been reviewed today, with its
// stability kept, so the next answers count as same-day reviews. Familiarity
// of countries last seen earlier goes up, as it is measured from today.
export function makeAllSeenToday(progress: DeckProgress, today: string): DeckProgress {
  return mapQuestions(progress, (question) => ({ ...question, lastReview: today }))
}

// How long ago a well-known country was first answered.
const WELL_KNOWN_FIRST_REVIEW_DAYS_AGO = 180
// How long ago a shaky country was answered wrongly.
const SHAKY_REVIEW_DAYS_AGO = 7
// A well-known question is answered again each time its chance of being
// remembered drops below this.
const WELL_KNOWN_REVIEW_RECALL = 0.9

// A question first answered right WELL_KNOWN_FIRST_REVIEW_DAYS_AGO, then
// answered right again each day its chance of being remembered had dropped
// below WELL_KNOWN_REVIEW_RECALL, up to today.
function wellKnownQuestion(today: string): QuestionProgress {
  let day = addDays(today, -WELL_KNOWN_FIRST_REVIEW_DAYS_AGO)
  let question = reviewQuestion(undefined, 'right', day)
  while (day < today) {
    day = addDays(day, 1)
    if (recallChance(question, day) < WELL_KNOWN_REVIEW_RECALL) {
      question = reviewQuestion(question, 'right', day)
    }
  }
  return question
}

// A question answered once, wrongly, SHAKY_REVIEW_DAYS_AGO days ago, so it is
// barely remembered.
function shakyQuestion(today: string): QuestionProgress {
  return reviewQuestion(undefined, 'wrong', addDays(today, -SHAKY_REVIEW_DAYS_AGO))
}

// The codes of the countries not yet in the Passport in `count` random groups
// that still have some (fewer groups if fewer are left). `random` is a
// parameter so tests can make the choice predictable.
export function unseenCountriesInRandomGroups(
  progress: DeckProgress,
  count: number,
  random: () => number = Math.random,
): string[] {
  const unfinishedGroupIds = COUNTRY_GROUPS.map((group) => group.id).filter(
    (id) => unseenCountriesInGroup(id, progress).length > 0,
  )
  const chosen: string[] = []
  for (let i = 0; i < count && unfinishedGroupIds.length > 0; i++) {
    const index = Math.floor(random() * unfinishedGroupIds.length)
    const groupId = unfinishedGroupIds.splice(index, 1)[0]
    chosen.push(...unseenCountriesInGroup(groupId, progress))
  }
  return chosen
}

// Adds the countries to the Passport with all 5 questions answered: 'well-known'
// ones have high familiarity; 'shaky' ones have low familiarity (enough of
// them stop Classic from showing new countries).
export function addCountries(
  progress: DeckProgress,
  codes: string[],
  kind: 'well-known' | 'shaky',
  today: string,
): DeckProgress {
  const result: DeckProgress = { ...progress }
  for (const code of codes) {
    const country: CountryProgress = {}
    for (const id of QUESTION_IDS) {
      country[id] = kind === 'well-known' ? wellKnownQuestion(today) : shakyQuestion(today)
    }
    result[code] = country
  }
  return result
}
