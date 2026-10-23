// Saves a colour for each country group in src/data/countryGroups.json to
// src/data/countryGroupColours.json, keyed by group id: the tint of the region
// globe and of the dev option. The picking rule is in
// src/features/globe/countryGroupColours.ts (bright, and neighbouring groups'
// hues kept apart).
//
// Groups already in the file keep their colour, so editing the groups only
// colours the new ones; colours of removed groups are dropped. Pass --all to
// pick every colour again. A colour can be edited by hand, as long as it stays
// written as hsl(...) (the hue is read back to keep new groups apart from it).
//
// Usage: node scripts/make-country-group-colours.mjs [--all]
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  chooseGroupHues,
  colourToHue,
  groupNeighbours,
  hueToColour,
} from '../src/features/globe/countryGroupColours.ts'

const OUTPUT = 'src/data/countryGroupColours.json'

const groups = JSON.parse(readFileSync('src/data/countryGroups.json', 'utf8'))
const pickAll = process.argv.includes('--all')
const saved = !pickAll && existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : {}

const keptHues = new Map()
for (const group of groups) {
  const colour = saved[group.id]
  if (colour === undefined) continue
  const hue = colourToHue(colour)
  if (hue === null) throw new Error(`${group.id}: "${colour}" isn't written as hsl(...)`)
  keptHues.set(group.id, hue)
}

const hues = chooseGroupHues(groupNeighbours(), keptHues)
// In the order of countryGroups.json, so the file reads region by region.
const colours = {}
for (const group of groups) colours[group.id] = saved[group.id] ?? hueToColour(hues.get(group.id))

writeFileSync(OUTPUT, JSON.stringify(colours, null, 2) + '\n')
const newCount = groups.length - keptHues.size
console.log(`Wrote ${OUTPUT} (${newCount} new of ${groups.length} groups)`)
