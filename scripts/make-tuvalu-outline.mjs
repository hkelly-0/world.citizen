// Writes src/data/tuvaluOutline.json: Tuvalu's outline from world-atlas's
// 1:10m data. The 1:50m data used for every other country leaves Tuvalu out
// (its atolls are too small), and the 1:10m file is too big to bundle whole.
// Run with: node scripts/make-tuvalu-outline.mjs
import { writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import worldAtlas10m from 'world-atlas/countries-10m.json' with { type: 'json' }

const countries = feature(worldAtlas10m, worldAtlas10m.objects.countries)
const tuvalu = countries.features.find((country) => country.properties.name === 'Tuvalu')
if (tuvalu === undefined) throw new Error('Tuvalu not found in countries-10m.json')

writeFileSync('src/data/tuvaluOutline.json', JSON.stringify(tuvalu.geometry) + '\n')
console.log(`Tuvalu: ${tuvalu.geometry.coordinates.length} islands`)
