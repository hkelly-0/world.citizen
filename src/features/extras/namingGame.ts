import { compareNames, countryFacts } from '../../shared/countryFacts'
import { isCountryNameCorrect } from '../flashcards/countryNameAnswer'

// The ISO alpha-3 code of the country the typed name names, with the same
// rules as the flashcards' name question (common name, official name or a
// hand-written alternative, ignoring case, accents and surrounding spaces).
// Null if it names no country. No two countries share an accepted name, so at
// most one can match. Whether it was already named is up to the game.
export function namedCountry(typed: string): string | null {
  const country = Object.values(countryFacts).find((facts) => isCountryNameCorrect(typed, facts))
  return country?.isoAlpha3 ?? null
}

// The common names of the countries not yet named, A–Z (ignoring a leading
// "The").
export function remainingCountryNames(namedCodes: string[]): string[] {
  return Object.values(countryFacts)
    .filter((facts) => !namedCodes.includes(facts.isoAlpha3))
    .map((facts) => facts.commonName)
    .sort(compareNames)
}

// The stopwatch's time as m:ss, or h:mm:ss from an hour, in whole seconds
// rounded down (e.g. 0:07, 12:45, 1:02:03).
export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  if (hours === 0) return `${minutes}:${seconds}`
  return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
}
