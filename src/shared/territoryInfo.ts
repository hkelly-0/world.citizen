// A paragraph about a map area outside the 197 countries (e.g. Somaliland),
// hand-written in src/data/territoryInfo/{key}.md. Keyed like
// territorySubtitles.json: by ISO alpha-3 code, or by map name for areas with
// no code. Plain text for now.

// The one heading every file must have. Its paragraph is at most 80 words.
export const TERRITORY_INFO_HEADING = 'More info'

// Each area's file, keyed by its path (e.g. "/src/data/territoryInfo/HKG.md").
// Each is a separate chunk, loaded only when asked for, so the text stays out
// of the main bundle.
const infoFiles = import.meta.glob<string>('/src/data/territoryInfo/*.md', {
  query: '?raw',
  import: 'default',
})

const pathOf = (key: string) => `/src/data/territoryInfo/${key}.md`

// The keys of the areas that have a file.
export function territoriesWithInfo(): string[] {
  return Object.keys(infoFiles).map((path) =>
    path.replace('/src/data/territoryInfo/', '').replace('.md', ''),
  )
}

// Whether an area has a file. Known without loading it, so the panel can show
// the heading straight away.
export function hasTerritoryInfo(key: string): boolean {
  return infoFiles[pathOf(key)] !== undefined
}

// Loads an area's paragraph, or undefined if it has no file.
export async function loadTerritoryInfo(key: string): Promise<string | undefined> {
  const loadFile = infoFiles[pathOf(key)]
  if (loadFile === undefined) return undefined
  return parseTerritoryInfo(await loadFile())
}

// Gives the paragraph under the file's one heading, with surrounding
// whitespace trimmed. Throws unless the file is exactly one
// "## TERRITORY_INFO_HEADING" line followed by a non-empty paragraph.
export function parseTerritoryInfo(markdown: string): string {
  // Splitting on a pattern with a capture group keeps the captured headings,
  // so the pieces alternate: text before the first heading, heading, text, ...
  const pieces = markdown.split(/^## (.*)$/m)
  if (pieces[0].trim() !== '') throw new Error('Text before the heading')
  const headings = pieces.filter((_, i) => i % 2 === 1).map((heading) => heading.trim())
  if (headings.join('\n') !== TERRITORY_INFO_HEADING) {
    throw new Error(
      `Heading should be just ${TERRITORY_INFO_HEADING}; found ${headings.join(', ')}`,
    )
  }
  const text = pieces[2].trim()
  if (text === '') throw new Error(`Empty section: ${TERRITORY_INFO_HEADING}`)
  return text
}
