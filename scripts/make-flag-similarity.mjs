// Compares every pair of flags in public/flags, saves each flag's closest
// matches to src/data/flagSimilarity.json, and draws docs/flag-similarity.png (each flag
// with its closest matches) for checking the result by eye. The comparison is
// in src/features/flashcards/flagSimilarity.ts.
//
// The JSON has every country, each with its SIMILAR_FLAGS_KEPT most similar
// others and their similarity (0 to 1), most similar first:
// { "TCD": { "ROU": 0.96, ... }, ... }.
//
// Rerun after changing the flags or the comparison.
//
// Usage: node scripts/make-flag-similarity.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import {
  FLAG_HEIGHT,
  FLAG_WIDTH,
  flagFeatures,
  flagSimilarity,
} from '../src/features/flashcards/flagSimilarity.ts'

const OUTPUT = 'src/data/flagSimilarity.json'
const SHEET_OUTPUT = 'docs/flag-similarity.png'

// How many of each flag's closest matches are saved.
const SIMILAR_FLAGS_KEPT = 15

// Contact sheet layout: each row is a flag then its closest matches, with the
// rows split into columns side by side.
const MATCHES_SHOWN = 5
const SHEET_COLUMNS = 3
const SHEET_FLAG_WIDTH = 72
const SHEET_FLAG_HEIGHT = 48
const LABEL_HEIGHT = 16
const GAP = 8

const codes = Object.keys(JSON.parse(readFileSync('src/data/countries.json', 'utf8'))).sort()

// Each flag drawn stretched to FLAG_WIDTH x FLAG_HEIGHT on a transparent canvas.
const images = {}
const features = {}
const flagCanvas = createCanvas(FLAG_WIDTH, FLAG_HEIGHT)
const flagContext = flagCanvas.getContext('2d')
for (const code of codes) {
  images[code] = await loadImage(readFileSync(`public/flags/${code}.svg`))
  flagContext.clearRect(0, 0, FLAG_WIDTH, FLAG_HEIGHT)
  flagContext.drawImage(images[code], 0, 0, FLAG_WIDTH, FLAG_HEIGHT)
  features[code] = flagFeatures(flagContext.getImageData(0, 0, FLAG_WIDTH, FLAG_HEIGHT).data)
}

// Similarity is symmetric, so each pair is compared once.
const similarities = {}
for (const code of codes) similarities[code] = {}
for (let i = 0; i < codes.length; i++) {
  for (let j = i + 1; j < codes.length; j++) {
    const similarity =
      Math.round(flagSimilarity(features[codes[i]], features[codes[j]]) * 1000) / 1000
    similarities[codes[i]][codes[j]] = similarity
    similarities[codes[j]][codes[i]] = similarity
  }
}

// One country per line, so the file stays a readable size.
const lines = codes.map((code) => {
  const sorted = Object.entries(similarities[code])
    .sort(([, a], [, b]) => b - a)
    .slice(0, SIMILAR_FLAGS_KEPT)
  return `  ${JSON.stringify(code)}: ${JSON.stringify(Object.fromEntries(sorted))}`
})
writeFileSync(OUTPUT, `{\n${lines.join(',\n')}\n}\n`)
console.log(`Wrote ${OUTPUT} (${codes.length} countries)`)

const cellWidth = SHEET_FLAG_WIDTH + GAP
const rowHeight = SHEET_FLAG_HEIGHT + LABEL_HEIGHT + GAP
// The flag itself, a wider gap, then its matches.
const columnWidth = cellWidth * (1 + MATCHES_SHOWN) + 3 * GAP
const rowsPerColumn = Math.ceil(codes.length / SHEET_COLUMNS)
const sheetWidth = columnWidth * SHEET_COLUMNS + GAP
const sheetHeight = rowHeight * rowsPerColumn + GAP

const sheet = createCanvas(sheetWidth, sheetHeight)
const context = sheet.getContext('2d')
context.fillStyle = '#ccc'
context.fillRect(0, 0, sheetWidth, sheetHeight)
context.font = '12px sans-serif'
context.textBaseline = 'top'

function drawFlag(code, label, x, y) {
  context.drawImage(images[code], x, y, SHEET_FLAG_WIDTH, SHEET_FLAG_HEIGHT)
  context.fillStyle = '#000'
  context.fillText(label, x, y + SHEET_FLAG_HEIGHT + 2)
}

codes.forEach((code, index) => {
  const x = GAP + Math.floor(index / rowsPerColumn) * columnWidth
  const y = GAP + (index % rowsPerColumn) * rowHeight
  drawFlag(code, code, x, y)
  const matches = Object.entries(similarities[code])
    .sort(([, a], [, b]) => b - a)
    .slice(0, MATCHES_SHOWN)
  matches.forEach(([match, similarity], m) => {
    drawFlag(match, `${match} ${similarity.toFixed(2)}`, x + cellWidth * (m + 1) + 2 * GAP, y)
  })
})

writeFileSync(SHEET_OUTPUT, sheet.toBuffer('image/png'))
console.log(`Wrote ${SHEET_OUTPUT} (${sheetWidth}x${sheetHeight})`)
