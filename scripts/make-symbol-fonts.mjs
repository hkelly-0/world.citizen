// Writes tiny fonts holding only the symbols the app shows that the bundled
// Roboto Mono (from @fontsource/roboto-mono) lacks, so they look the same on
// every device instead of falling back to the system's monospace font.
// src/index.css lists them after Roboto Mono in font-family, limited to these
// characters with unicode-range.
//
// Sources (both SIL Open Font License, which allows subsetting):
// - ≥ from Roboto Mono itself: the original font has it, but Fontsource's
//   subsets leave it out. https://github.com/googlefonts/RobotoMono
// - ← → ✓ from JetBrains Mono, as Roboto Mono has none of them. Its characters
//   are the same width as Roboto Mono's. https://github.com/JetBrains/JetBrainsMono
// The *_COMMIT constants pin the versions, so reruns give the same files.
//
// Only the regular weight is made, as none of the symbols are shown in bold.
// To add a symbol, add it to `characters` below, rerun, and add it to the
// matching unicode-range in src/index.css.
//
// Usage: node scripts/make-symbol-fonts.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import subsetFont from 'subset-font'

const OUTPUT = 'src/assets/fonts'
const ROBOTO_MONO_COMMIT = '895ec691990d041dd727c7b5afa3ce56525d98e6'
const JETBRAINS_MONO_COMMIT = '19371302b95d218af43299bce79ddbddd0bc364d'

const fonts = [
  {
    output: 'roboto-mono-symbols.woff2',
    url: `https://raw.githubusercontent.com/googlefonts/RobotoMono/${ROBOTO_MONO_COMMIT}/fonts/variable/RobotoMono%5Bwght%5D.ttf`,
    characters: '≥',
    // The source is a variable font; this fixes it at the regular weight.
    variationAxes: { wght: 400 },
  },
  {
    output: 'jetbrains-mono-symbols.woff2',
    url: `https://raw.githubusercontent.com/JetBrains/JetBrainsMono/${JETBRAINS_MONO_COMMIT}/fonts/ttf/JetBrainsMono-Regular.ttf`,
    characters: '←→✓',
  },
]

mkdirSync(OUTPUT, { recursive: true })
for (const { output, url, characters, variationAxes } of fonts) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${output}: ${response.status} from ${url}`)
  const source = Buffer.from(await response.arrayBuffer())

  const subset = await subsetFont(source, characters, { targetFormat: 'woff2', variationAxes })
  writeFileSync(`${OUTPUT}/${output}`, subset)
  console.log(`${output} (${characters}): ${(subset.length / 1024).toFixed(1)} KB`)
}
