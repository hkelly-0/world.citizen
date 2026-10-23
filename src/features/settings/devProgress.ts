import { countryFacts } from '../../shared/countryFacts'
import { collectedCountries } from '../passport/passport'
import { addDays } from '../flashcards/dates'
import { QUESTION_IDS, type CountryProgress, type DeckProgress } from '../flashcards/deck'
import { reviewQuestion, type QuestionProgress } from '../flashcards/fsrs'

// Changes to saved flashcard progress for testing different situations, used
// by the Developer section of Settings (dev server only). Each returns new
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

// As if `days` days had passed: every review and due date moves that many days
// into the past, so reviews come due and familiarity drops.
export function skipAheadDays(progress: DeckProgress, days: number): DeckProgress {
  return mapQuestions(progress, (question) => ({
    ...question,
    lastReview: addDays(question.lastReview, -days),
    dueDate: addDays(question.dueDate, -days),
  }))
}

// Every answered question becomes due today. Review dates are kept.
export function makeAllDueToday(progress: DeckProgress, today: string): DeckProgress {
  return mapQuestions(progress, (question) => ({ ...question, dueDate: today }))
}

// Every question due today or earlier becomes due tomorrow, so no seen country
// is due. Unseen countries are still offered in Classic.
export function makeNothingDueToday(progress: DeckProgress, today: string): DeckProgress {
  const tomorrow = addDays(today, 1)
  return mapQuestions(progress, (question) =>
    question.dueDate <= today ? { ...question, dueDate: tomorrow } : question,
  )
}

// How long ago a well-known country was first answered.
const WELL_KNOWN_FIRST_REVIEW_DAYS_AGO = 180
// How long ago a shaky country was answered wrongly.
const SHAKY_REVIEW_DAYS_AGO = 7

// A question answered right on every due date since
// WELL_KNOWN_FIRST_REVIEW_DAYS_AGO, so it is next due after today.
function wellKnownQuestion(today: string): QuestionProgress {
  let question = reviewQuestion(
    undefined,
    'right',
    addDays(today, -WELL_KNOWN_FIRST_REVIEW_DAYS_AGO),
  )
  while (question.dueDate <= today) {
    question = reviewQuestion(question, 'right', question.dueDate)
  }
  return question
}

// A question answered once, wrongly, SHAKY_REVIEW_DAYS_AGO days ago, so it is
// overdue and barely remembered.
function shakyQuestion(today: string): QuestionProgress {
  return reviewQuestion(undefined, 'wrong', addDays(today, -SHAKY_REVIEW_DAYS_AGO))
}

// The codes of `count` random countries not yet in the Passport (fewer if
// fewer are left). `random` is a parameter so tests can make the choice
// predictable.
export function randomUnseenCountries(
  progress: DeckProgress,
  count: number,
  random: () => number = Math.random,
): string[] {
  const collectedCodes = collectedCountries(progress).map((country) => country.isoAlpha3)
  const unseenCodes = Object.keys(countryFacts).filter((code) => !collectedCodes.includes(code))
  const chosen: string[] = []
  while (chosen.length < count && unseenCodes.length > 0) {
    const index = Math.floor(random() * unseenCodes.length)
    chosen.push(unseenCodes.splice(index, 1)[0])
  }
  return chosen
}

// Adds the countries to the Passport with all 5 questions answered: 'well-known'
// ones have high familiarity and aren't due; 'shaky' ones have low familiarity
// (enough of them bring up the new-country warning) and are overdue.
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
