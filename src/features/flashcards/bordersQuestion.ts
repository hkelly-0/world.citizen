import countryBordersJson from '../../data/countryBorders.json'
import { compareNames, countryFacts } from '../../shared/countryFacts'
import { isCountryNameCorrect } from './countryNameAnswer'

// How many text boxes the borders question offers. Countries with fewer
// neighbours are answered by leaving the rest blank.
export const BORDER_ANSWER_BOXES = 4

// Each country's land neighbours (ISO alpha-3 codes), made by
// scripts/make-country-borders.mjs. Empty for islands.
const COUNTRY_BORDERS: Record<string, string[]> = countryBordersJson

// The countries sharing a land border with `code`, by common name A–Z.
export function borderingCountries(code: string): string[] {
  return [...COUNTRY_BORDERS[code]].sort((a, b) =>
    compareNames(countryFacts[a].commonName, countryFacts[b].commonName),
  )
}

// For each typed box, the bordering country it names (any name the country
// name question accepts), or null if it is blank, names no bordering country,
// or repeats one named in an earlier box.
export function markBorderAnswers(typed: string[], borderCodes: string[]): (string | null)[] {
  const named: string[] = []
  return typed.map((text) => {
    const code = borderCodes.find((code) => isCountryNameCorrect(text, countryFacts[code]))
    if (code === undefined || named.includes(code)) return null
    named.push(code)
    return code
  })
}

// For each typed box, whether it is right. A filled box is right if
// `markBorderAnswers` finds a bordering country in it. A blank box is wrong if
// fewer boxes were filled than the country has neighbours, as one could have
// gone in it; the first such blanks are wrong, the rest right.
export function borderBoxResults(typed: string[], borderCodes: string[]): boolean[] {
  const marks = markBorderAnswers(typed, borderCodes)
  const isBlank = typed.map((text) => text.trim() === '')
  const guessCount = isBlank.filter((blank) => !blank).length
  let missedLeft = Math.max(borderCodes.length - guessCount, 0)
  return typed.map((_, index) => {
    if (!isBlank[index]) return marks[index] !== null
    if (missedLeft === 0) return true
    missedLeft--
    return false
  })
}

// The country for a borders question: a random Passport country with land
// neighbours, other than `previousCode` unless it is the only one. Null if no
// Passport country has land neighbours. `random` is a parameter so tests can
// make the choice predictable.
export function bordersQuestionCountry(
  passportCodes: string[],
  previousCode: string | null,
  random: () => number,
): string | null {
  const withNeighbours = passportCodes.filter((code) => COUNTRY_BORDERS[code].length > 0)
  const notRepeated = withNeighbours.filter((code) => code !== previousCode)
  const choices = notRepeated.length > 0 ? notRepeated : withNeighbours
  if (choices.length === 0) return null
  return choices[Math.floor(random() * choices.length)]
}

// The bordering countries not yet named in `earlierRounds` (each a round's
// typed boxes), in `borderCodes` order. Each earlier round named only
// neighbours, or the question would have ended after it.
export function remainingBorders(earlierRounds: string[][], borderCodes: string[]): string[] {
  let remaining = borderCodes
  for (const round of earlierRounds) {
    const named = markBorderAnswers(round, remaining)
    remaining = remaining.filter((code) => !named.includes(code))
  }
  return remaining
}

// After a round's boxes `typed` are revealed, how many boxes the next round
// offers: as many neighbours as are left, up to BORDER_ANSWER_BOXES. 0 ends
// the question: every neighbour is named, or a box is wrong (`borderBoxResults`).
// `remaining` is the round's `remainingBorders`.
export function nextRoundBoxCount(typed: string[], remaining: string[]): number {
  if (!borderBoxResults(typed, remaining).every((isCorrect) => isCorrect)) return 0
  const namedCount = markBorderAnswers(typed, remaining).filter((code) => code !== null).length
  return Math.min(remaining.length - namedCount, BORDER_ANSWER_BOXES)
}

// Shown above a later round's boxes, `remainingCount` being how many
// neighbours are left to name.
export function nextRoundPrompt(remainingCount: number): string {
  return remainingCount > BORDER_ANSWER_BOXES
    ? `Nice. ${BORDER_ANSWER_BOXES} more?`
    : `Nice. Last ${remainingCount}?`
}
