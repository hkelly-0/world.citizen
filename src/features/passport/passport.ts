import {
  COUNTRY_GROUPS,
  countryFacts,
  type CountryFacts,
  type CountryGroup,
} from '../../shared/countryFacts'
import type { Discoveries } from '../../shared/discoveries'
import type { PassportSort } from '../../shared/passportSort'
import type { DeckProgress, QuestionId } from '../flashcards/deck'
import { countryRecall } from '../flashcards/familiarity'

// How many countries there are to collect: the 195.
export const COUNTRY_COUNT = Object.keys(countryFacts).length

// The countries in the Passport: those with at least one flashcard question
// answered (in Classic or Custom Practice), in alphabetical order.
export function collectedCountries(progress: DeckProgress): CountryFacts[] {
  return Object.values(countryFacts)
    .filter((country) => isCollected(progress, country.isoAlpha3))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))
}

// Whether the country is in the Passport: at least one question answered.
function isCollected(progress: DeckProgress, code: string): boolean {
  const questions = progress[code]
  return questions !== undefined && Object.keys(questions).length > 0
}

function groupById(groupId: string): CountryGroup | undefined {
  return COUNTRY_GROUPS.find((group) => group.id === groupId)
}

// The group's countries not yet in the Passport, as ISO alpha-3 codes, in
// countryGroups.json order.
export function unseenCountriesInGroup(groupId: string, progress: DeckProgress): string[] {
  const group = groupById(groupId)
  if (group === undefined) return []
  return group.countries.filter((code) => !isCollected(progress, code))
}

// The group new countries come from: `savedId` (the user's choice, from
// learningGroup.ts) while it still has countries not in the Passport. Null
// when there is no choice or the group is finished, so the user chooses again.
export function pendingGroupId(savedId: string | null, progress: DeckProgress): string | null {
  if (savedId === null) return null
  return unseenCountriesInGroup(savedId, progress).length > 0 ? savedId : null
}

// A group the user can choose to learn, with how many of its countries are
// already in the Passport.
export type GroupChoice = { id: string; name: string; seenCount: number; size: number }

// The groups with countries not yet in the Passport, A–Z by name, for the
// "choose a group" dropdown.
export function groupsToChoose(progress: DeckProgress): GroupChoice[] {
  return COUNTRY_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    seenCount: group.countries.filter((code) => isCollected(progress, code)).length,
    size: group.countries.length,
  }))
    .filter((choice) => choice.seenCount < choice.size)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Where the next new country of a pending group comes in it, e.g. "(2 of 4)"
// when 1 of its 4 countries is already in the Passport.
export function groupProgressLabel(groupId: string, progress: DeckProgress): string {
  const group = groupById(groupId)!
  const seenCount = group.countries.length - unseenCountriesInGroup(groupId, progress).length
  return `(${seenCount + 1} of ${group.countries.length})`
}

// A random country of the group not yet in the Passport, for the "New
// country" card, as its ISO alpha-3 code. Null once all of them are collected.
// `random` is a parameter so tests can make the choice predictable.
export function randomUnseenCountryInGroup(
  progress: DeckProgress,
  groupId: string,
  random: () => number = Math.random,
): string | null {
  const unseenCodes = unseenCountriesInGroup(groupId, progress)
  if (unseenCodes.length === 0) return null
  return unseenCodes[Math.floor(random() * unseenCodes.length)]
}

// A Passport country counts as unfamiliar when its familiarity (`countryRecall`)
// is below this.
const UNFAMILIAR_RECALL = 0.75

// A new country comes only while at most this many Passport countries are
// unfamiliar.
const MAX_UNFAMILIAR_COUNTRIES = 3

// The warning shown on the Passport's "New country" card when
// `isTooUnfamiliarForNewCountry`.
export const NEW_COUNTRY_WARNING =
  "It's recommended to become more familiar with the countries you've already seen before learning new ones."

// Below this many countries in the Passport, a new country always comes, so
// beginners aren't held back while there is little to be familiar with.
const NEW_COUNTRY_WARNING_MIN_COUNTRIES = 12

// Whether the user should get more familiar with the countries already seen
// before a new one: at least NEW_COUNTRY_WARNING_MIN_COUNTRIES countries are in
// the Passport, and more than MAX_UNFAMILIAR_COUNTRIES of them are below
// UNFAMILIAR_RECALL for `questionIds`. A country with none of `questionIds`
// answered has no familiarity and counts as unfamiliar. In Classic flashcards a
// new country comes only when this is false; the Passport's "New country" card
// warns when it is true.
export function isTooUnfamiliarForNewCountry(
  progress: DeckProgress,
  questionIds: QuestionId[],
  today: string,
): boolean {
  const collected = collectedCountries(progress)
  if (collected.length < NEW_COUNTRY_WARNING_MIN_COUNTRIES) return false
  const unfamiliarCount = collected.filter((country) => {
    const recall = countryRecall(progress[country.isoAlpha3], questionIds, today)
    return recall === null || recall < UNFAMILIAR_RECALL
  }).length
  return unfamiliarCount > MAX_UNFAMILIAR_COUNTRIES
}

// The countries in the Passport, sorted as chosen, with ties kept A–Z.
// - 'date-discovered' puts the first discovered at the top. Countries with no
//   discovery time (seen before times were recorded) count as discovered
//   together before all the others, so they come first.
// - 'recall' puts the least likely to be remembered 14 days after `today` at the top,
//   using only `learnedQuestionIds`. Countries with none of those answered
//   have no recall chance and come last.
export function sortedCollectedCountries(
  progress: DeckProgress,
  discoveries: Discoveries,
  learnedQuestionIds: QuestionId[],
  sort: PassportSort,
  today: string,
): CountryFacts[] {
  // Already alphabetical, and sort() keeps that order between equal values.
  const countries = collectedCountries(progress)
  if (sort === 'date-discovered') {
    // '' sorts before every time.
    const discoveredAt = (country: CountryFacts) => discoveries[country.isoAlpha3] ?? ''
    return countries.sort((a, b) => discoveredAt(a).localeCompare(discoveredAt(b)))
  }
  if (sort === 'recall') {
    // Infinity sorts after every recall chance.
    const recall = (country: CountryFacts) =>
      countryRecall(progress[country.isoAlpha3], learnedQuestionIds, today) ?? Infinity
    // Infinity − Infinity is NaN, which sort() would mishandle, so equal
    // chances are compared first.
    return countries.sort((a, b) => (recall(a) === recall(b) ? 0 : recall(a) - recall(b)))
  }
  return countries
}
