import type { QuestionId } from '../flashcards/deck'

// The explanation shown above each question on the home country's card, which
// asks every question type. Ranges are explained on area, the first of them,
// and the info questions on history, the first of those.
export const HOME_CARD_NOTES: Partial<Record<QuestionId, string>> = {
  globe: 'We start by locating the country on the globe.',
  flag: 'Next is its flag.',
  area: 'Numerical stats are grouped into ranges, to make memorization easier.',
  ihdi: "IHDI = Inequality-adjusted Human Development Index. A composite statistic which reflects lifespan, years of schooling, and GNI per capita, all adjusted based on inequality. Published by the United Nations.\n\nWe've rounded it to the nearest whole number.",
  capital: 'Text entry boxes ignore case and accents.',
  history:
    "The following sections are AI-written summaries describing the country's History, People, Economy, and International Relations.\n\nThey're meant to build a very basic understanding of these topics, as a starting point for broad knowledge of the whole world.",
  people:
    'We recommend treating these questions like old-fashioned flashcards - Try your best to recall the key ideas in your head, then press reveal, and grade yourself on what you remembered.',
}

// Shown below a question's note on the home country's card, in a red box.
export const HOME_CARD_WARNINGS: Partial<Record<QuestionId, string>> = {
  history:
    "WARNING: we haven't yet been able to individually fact-check these paragraphs. AI makes mistakes.",
}

// Shown on its own page after the home country is chosen, before its card.
export const FLASHCARDS_INTRO =
  "world.citizen is primarily a flashcard app: you'll get to gradually learn about every country while using spaced repetition to cement the information you've already learned.\n\nNext up is a walkthrough of the flashcard for your home country."

// Shown under the reward once the home country's card is finished.
export const HOME_CARD_REWARD_NOTE = "Nice work. Let's briefly look at the rest of the app."

export const PASSPORT_NOTE =
  "This is your Passport: your collection of every country you've studied in the app.\n\nIt starts small but can grow quickly if you practice persistently."

// Familiarity is explained in two notes after the Passport note's Next, still
// over the Passport: what it is, then how it changes.
export const FAMILIARITY_NOTE =
  'The coloured ring beside each name is its Familiarity: a statistical estimate of the likelihood you could correctly remember all of the facts about that country, 2 weeks from now.'

export const FAMILIARITY_CHANGE_NOTE =
  "Familiarity increases whenever you answer a question right, but it also naturally decreases over time if you haven't seen that country in a while."

export const SETTINGS_NOTE =
  "Select the information you're most interested in learning - only these questions will appear on flashcards.\n\nYou can update your choices at any time in Settings, and nothing you've learned is ever deleted.\n\nKeep in mind that it's easier to learn about many countries if you select fewer items."

export const FLASHCARDS_MENU_NOTE =
  'Classic Mode is the main way to learn: it mixes countries you know with new ones, one region at a time.\n\nCustom Practice lets you do targeted practice - for example if you want to just train flags today.'
