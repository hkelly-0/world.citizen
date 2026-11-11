import continentsJson from '../../data/continents.json'
import { compareNames, countryFacts } from '../../shared/countryFacts'
import { isCountryNameCorrect } from '../flashcards/countryNameAnswer'

// The part of the world one game asks for: the whole world or one continent,
// chosen on the Extras menu.
export type NamingArea = {
  // Kept in the game screen's history entry, so reloading the website plays
  // the same area.
  id: string
  // Shown on the Extras menu, e.g. "Europe".
  name: string
  // ISO alpha-3 codes of the countries to name.
  countries: string[]
  // The [longitude, latitude] the globe starts centred on.
  centre: [number, number]
}

// Each continent's countries, hand-written in continents.json. Every one of
// the 197 is in exactly one continent, e.g. Russia and Cyprus in Europe,
// Turkey, the Caucasus, and Kazakhstan in Asia, Egypt in Africa.
const CONTINENTS: { id: string; name: string; countries: string[] }[] = continentsJson

// Roughly the middle of each continent, so its game starts facing it.
const CONTINENT_CENTRES: Record<string, [number, number]> = {
  africa: [20, 0],
  americas: [-75, 15],
  asia: [90, 30],
  europe: [15, 50],
  oceania: [160, -15],
}

// The areas in the order the Extras menu lists them: the world first, then
// the continents A–Z, as continents.json lists them. The world starts from
// the usual globe view (createCountryMap's centre).
export const NAMING_AREAS: NamingArea[] = [
  { id: 'world', name: 'The World', countries: Object.keys(countryFacts), centre: [0, 20] },
  ...CONTINENTS.map((continent) => ({ ...continent, centre: CONTINENT_CENTRES[continent.id] })),
]

// The ISO alpha-3 code of the country the typed name names, with the same
// rules as the flashcards' name question (common name, official name, or a
// hand-written alternative, ignoring case, accents, and surrounding spaces).
// Null if it names no country. No two countries share an accepted name, so at
// most one can match. Whether it was already named is up to the game.
export function namedCountry(typed: string): string | null {
  const country = Object.values(countryFacts).find((facts) => isCountryNameCorrect(typed, facts))
  return country?.isoAlpha3 ?? null
}

// The common names of the area's countries not yet named, A–Z (ignoring a
// leading "The").
export function remainingCountryNames(area: NamingArea, namedCodes: string[]): string[] {
  return area.countries
    .filter((isoAlpha3) => !namedCodes.includes(isoAlpha3))
    .map((isoAlpha3) => countryFacts[isoAlpha3].commonName)
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
