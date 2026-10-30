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
