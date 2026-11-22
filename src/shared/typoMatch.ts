import { normalize } from './normalize'

// Typed names count as right with a few typos: none for names up to
// NO_TYPOS_UP_TO letters, one for names up to ONE_TYPO_UP_TO letters, and
// MAX_TYPOS for longer ones. Short names get none because one letter changes
// them into other names (e.g. Iran and Iraq, Mali and Malta).
const NO_TYPOS_UP_TO = 4
const ONE_TYPO_UP_TO = 8
export const MAX_TYPOS = 2

// How many typos are allowed in typing `name` (already normalized).
export function allowedTypos(name: string): number {
  const length = [...name].length
  if (length <= NO_TYPOS_UP_TO) return 0
  if (length <= ONE_TYPO_UP_TO) return 1
  return MAX_TYPOS
}

// How many typos turn `a` into `b`: each letter added, left out, or changed,
// or two neighbouring letters swapped, is one typo (e.g. "Bnein" -> "Benin"
// is 1). This is the "optimal string alignment" distance.
export function typoDistance(a: string, b: string): number {
  // Split into letters so letters outside the Basic Multilingual Plane count once.
  const aLetters = [...a]
  const bLetters = [...b]
  // distances[i][j] is the typos between the first i letters of `a` and the first j of `b`.
  const distances: number[][] = []
  for (let i = 0; i <= aLetters.length; i++) {
    distances.push([i])
    for (let j = 1; j <= bLetters.length; j++) {
      if (i === 0) {
        distances[i].push(j)
        continue
      }
      const changeCost = aLetters[i - 1] === bLetters[j - 1] ? 0 : 1
      let best = Math.min(
        distances[i - 1][j] + 1, // a letter of `a` left out
        distances[i][j - 1] + 1, // a letter of `b` added
        distances[i - 1][j - 1] + changeCost, // a letter changed (or kept)
      )
      const isSwap =
        i > 1 && j > 1 && aLetters[i - 1] === bLetters[j - 2] && aLetters[i - 2] === bLetters[j - 1]
      if (isSwap) best = Math.min(best, distances[i - 2][j - 2] + 1)
      distances[i].push(best)
    }
  }
  return distances[aLetters.length][bLetters.length]
}

// One thing a typed answer can name (e.g. a country, or a country's
// capitals), with every name accepted for it. Names are normalized once, here,
// as answers are checked against every option on each keystroke in places.
export type AnswerOption = {
  key: string
  names: { name: string; normalized: string }[]
}

export function answerOption(key: string, names: string[]): AnswerOption {
  return { key, names: names.map((name) => ({ name, normalized: normalize(name) })) }
}

// An option a typed answer names, with the accepted name it matched (as
// written in the data, e.g. "Türkiye").
export type AnswerMatch = { key: string; name: string }

// The options the typed answer names. Those with a name matching it exactly
// (ignoring case, accents, and surrounding spaces) if any; usually one, more
// only if options share a name. Otherwise the option with the closest name,
// if it is within `allowedTypos` of that name and no other option is as
// close; so a typo of Iran that is as close to Iraq names neither.
export function matchAnswer(typed: string, options: AnswerOption[]): AnswerMatch[] {
  const query = normalize(typed)
  if (query === '') return []

  const exactMatches: AnswerMatch[] = []
  for (const option of options) {
    const exact = option.names.find((name) => name.normalized === query)
    if (exact !== undefined) exactMatches.push({ key: option.key, name: exact.name })
  }
  if (exactMatches.length > 0) return exactMatches

  // The closest names, among those at most MAX_TYPOS away (no further one
  // could be accepted, or tie with one that is).
  const queryLength = [...query].length
  let closestDistance = MAX_TYPOS + 1
  let closest: { key: string; name: string; normalized: string }[] = []
  for (const option of options) {
    for (const name of option.names) {
      // The typos are at least the difference in length, so most names are skipped quickly.
      if (Math.abs([...name.normalized].length - queryLength) > MAX_TYPOS) continue
      const distance = typoDistance(query, name.normalized)
      if (distance < closestDistance) {
        closestDistance = distance
        closest = [{ key: option.key, ...name }]
      } else if (distance === closestDistance) {
        closest.push({ key: option.key, ...name })
      }
    }
  }
  const closestKeys = new Set(closest.map((match) => match.key))
  if (closestKeys.size !== 1) return []
  // An option can have several names this close (e.g. a name and its
  // alternative); the first is shown.
  const [match] = closest
  if (closestDistance > allowedTypos(match.normalized)) return []
  return [{ key: match.key, name: match.name }]
}

// Whether `query` (already normalized) is the start of `name` (already
// normalized) with up to `allowedTypos(query)` typos, for search boxes that
// suggest names as they are typed (e.g. "austrl" for Australia).
export function startsWithTypos(name: string, query: string): boolean {
  const allowed = allowedTypos(query)
  if (allowed === 0) return false
  const nameLetters = [...name]
  const queryLength = [...query].length
  // The typos may have made the query longer or shorter than the part of the name it stands for.
  for (let length = queryLength - allowed; length <= queryLength + allowed; length++) {
    if (length < 1 || length > nameLetters.length) continue
    if (typoDistance(query, nameLetters.slice(0, length).join('')) <= allowed) return true
  }
  return false
}
