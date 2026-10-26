import { recordDiscovery, removeDiscoveries } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { removeCountriesFromReviewLog } from '../../shared/reviewLog'
import type { CountryProgress, DeckProgress, QuestionId } from '../flashcards/deck'
import { reviewQuestion } from '../flashcards/fsrs'
import { collectedCountries } from '../passport/passport'

// Editing the Passport by hand, from Settings (`PassportEditor.tsx`). A
// country is in the Passport when it has progress for at least one question
// (`collectedCountries`), so editing it means changing that progress.

// The ISO alpha-3 codes of the countries in the Passport, A–Z by name.
export function passportCodes(progress: DeckProgress): string[] {
  return collectedCountries(progress).map((country) => country.isoAlpha3)
}

// The progress with the Passport holding exactly `codes`. Countries left out
// lose all their progress. Countries added get one right answer today for each
// of `learnedQuestionIds`, as if their card had been answered perfectly once.
// Countries already in the Passport keep their progress unchanged.
export function editedProgress(
  progress: DeckProgress,
  codes: string[],
  learnedQuestionIds: QuestionId[],
  today: string,
): DeckProgress {
  const result: DeckProgress = {}
  const keptCodes = passportCodes(progress)
  for (const code of codes) {
    if (keptCodes.includes(code)) {
      result[code] = progress[code]
    } else {
      const added: CountryProgress = {}
      for (const id of learnedQuestionIds) added[id] = reviewQuestion(undefined, 'right', today)
      result[code] = added
    }
  }
  return result
}

// Saves the Passport as holding exactly `codes`, as `editedProgress` does.
// Removed countries also lose their discovery times and logged answers; added
// ones are discovered now. Their made-up answers aren't logged, as the review
// log is for real answers.
export function savePassport(codes: string[], learnedQuestionIds: QuestionId[], today: string) {
  const progress = loadProgress()
  const oldCodes = passportCodes(progress)
  const removedCodes = oldCodes.filter((code) => !codes.includes(code))
  const addedCodes = codes.filter((code) => !oldCodes.includes(code))

  saveProgress(editedProgress(progress, codes, learnedQuestionIds, today))
  removeDiscoveries(removedCodes)
  removeCountriesFromReviewLog(removedCodes)
  for (const code of addedCodes) recordDiscovery(code, new Date())
}
