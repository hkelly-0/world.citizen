import countryBordersJson from '../../data/countryBorders.json'
import { countryFacts } from '../../shared/countryFacts'
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
    countryFacts[a].commonName.localeCompare(countryFacts[b].commonName),
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

// For each typed box, whether it was left blank although a bordering country
// could have gone in it. Each bordering country not named in any box fills one
// blank box, from the first; blank boxes beyond those are right to leave blank.
export function missedBorderBoxes(typed: string[], borderCodes: string[]): boolean[] {
  const named = markBorderAnswers(typed, borderCodes).filter((code) => code !== null)
  let unnamedLeft = borderCodes.length - named.length
  return typed.map((text) => {
    if (text.trim() !== '' || unnamedLeft === 0) return false
    unnamedLeft--
    return true
  })
}
