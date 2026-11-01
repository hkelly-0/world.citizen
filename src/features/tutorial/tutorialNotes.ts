import { INFO_QUESTION_IDS, type QuestionId } from '../flashcards/deck'
import type { CardRewardDetails } from '../flashcards/rewardAfterCard'

// Shown on the first of the range questions asked (area, population, IHDI).
const RANGES_NOTE =
  'Numbers are learned as named ranges, not exact figures. Picking the range next to the right one counts as nearly right.'

// The explanation shown above each question on the home country's card, for
// the questions in `questionIds`. Range and info questions are explained once,
// on the first of them asked; later ones get a shorter note or none.
export function homeCardNotes(questionIds: QuestionId[]): Partial<Record<QuestionId, string>> {
  const notes: Partial<Record<QuestionId, string>> = {
    globe:
      'Every card starts on the globe. Drag to turn it, pinch or scroll to zoom, then tap the country.',
    flag: 'Pick its flag. The wrong options are flags that look alike, or those of nearby countries.',
    capital:
      "Type the capital. Upper or lower case and accents don't matter, and its name in the local language counts too.",
  }

  const rangeIds = (['area', 'population', 'ihdi'] as QuestionId[]).filter((id) =>
    questionIds.includes(id),
  )
  if (questionIds.includes('area')) notes.area = RANGES_NOTE
  if (questionIds.includes('population')) {
    notes.population = rangeIds[0] === 'population' ? RANGES_NOTE : 'Pick the named range again.'
  }
  if (questionIds.includes('ihdi')) {
    const meaning =
      "IHDI is the Inequality-adjusted Human Development Index: a country's health, education and income, lowered the more unequally they're shared."
    notes.ihdi = rangeIds[0] === 'ihdi' ? `${meaning} ${RANGES_NOTE}` : meaning
  }

  const firstInfoId = INFO_QUESTION_IDS.find((id) => questionIds.includes(id))
  if (firstInfoId !== undefined) {
    notes[firstInfoId] =
      'Now some background. Think about what you already know on the topic, then reveal the paragraph and say how much of it was new.'
  }
  return notes
}

// Shown under the reward once the home country's card is finished.
export function homeCardRewardNote(reward: CardRewardDetails): string {
  return reward.kind === 'new-country'
    ? 'Each country joins your Passport the first time you answer one of its questions.'
    : "The ring shows how familiar this country is. It fills as you answer right, and slowly empties when you haven't seen the country for a while."
}

export const PASSPORT_NOTE =
  "This is your Passport, with every country you've met. The ring beside each name is its Familiarity: how likely you are to remember its facts. Tap a country to play its card again, or New Country to discover another."

export const SETTINGS_NOTE =
  "Choose the information you're most interested in learning: only these are asked on the cards. You can change this in Settings any time, and nothing you've learned is lost."

export const FLASHCARDS_MENU_NOTE =
  'Classic Mode is the main way to learn: it mixes countries you know with new ones, one region at a time. Custom Practice asks only the questions you pick, about countries in your Passport.'
