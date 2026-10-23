import { QUESTION_IDS, type QuestionId } from '../features/flashcards/deck'

// The information the user wants to learn, chosen in Settings and kept in the
// browser's localStorage, on this device only. Information left out isn't
// shown on the globe's info panel or asked on any flashcards.
const STORAGE_KEY = 'geography-app/learned-question-ids'

// Everything is learned until the user changes it. Always returns at least one
// question type, in the order of QUESTION_IDS.
export function loadLearnedQuestionIds(): QuestionId[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return QUESTION_IDS
    const savedIds = JSON.parse(saved) as QuestionId[]
    const learned = QUESTION_IDS.filter((id) => savedIds.includes(id))
    return learned.length === 0 ? QUESTION_IDS : learned
  } catch {
    // Storage can be blocked (e.g. some private browsing modes) or hold
    // unreadable data; learn everything rather than crash.
    return QUESTION_IDS
  }
}

export function saveLearnedQuestionIds(questionIds: QuestionId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questionIds))
  } catch {
    // If storage is unavailable, the settings last only until the page closes.
  }
}
