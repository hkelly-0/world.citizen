// Paragraphs about one country, hand-written in src/data/countryInfo/{ISO}.md.
// Plain text for now.
export type CountryInfo = {
  history: string
  people: string
  economy: string
  internationalRelations: string
}

// The headings every file must have, exactly and in this order.
export const COUNTRY_INFO_HEADINGS: Record<keyof CountryInfo, string> = {
  history: 'History',
  people: 'People',
  economy: 'Economy',
  internationalRelations: 'International Relations',
}

// Each country's file, keyed by its path (e.g. "/src/data/countryInfo/CAN.md").
// Each is a separate chunk, loaded only when asked for, so the text stays out
// of the main bundle.
const infoFiles = import.meta.glob<string>('/src/data/countryInfo/*.md', {
  query: '?raw',
  import: 'default',
})

// The ISO alpha-3 codes of the countries that have a file. Not every country
// has one yet.
export function countriesWithInfo(): string[] {
  return Object.keys(infoFiles).map((path) =>
    path.replace('/src/data/countryInfo/', '').replace('.md', ''),
  )
}

// Loads a country's paragraphs, or undefined if it has no file yet.
export async function loadCountryInfo(isoAlpha3: string): Promise<CountryInfo | undefined> {
  const loadFile = infoFiles[`/src/data/countryInfo/${isoAlpha3}.md`]
  if (loadFile === undefined) return undefined
  return parseCountryInfo(await loadFile())
}

// Splits a file into its sections. Each "## Heading" line starts a section,
// and the text up to the next heading is its paragraph, with surrounding
// whitespace trimmed. Throws if the headings aren't exactly
// COUNTRY_INFO_HEADINGS in order, or a section is empty.
export function parseCountryInfo(markdown: string): CountryInfo {
  // Splitting on a pattern with a capture group keeps the captured headings,
  // so the pieces alternate: text before the first heading, heading, text,
  // heading, text, ...
  const pieces = markdown.split(/^## (.*)$/m)
  if (pieces[0].trim() !== '') throw new Error('Text before the first heading')

  const headings = pieces.filter((_, i) => i % 2 === 1).map((heading) => heading.trim())
  const texts = pieces.filter((_, i) => i > 0 && i % 2 === 0).map((text) => text.trim())
  const expectedHeadings = Object.values(COUNTRY_INFO_HEADINGS)
  if (headings.join('\n') !== expectedHeadings.join('\n')) {
    throw new Error(
      `Headings should be ${expectedHeadings.join(', ')}; found ${headings.join(', ')}`,
    )
  }
  texts.forEach((text, i) => {
    if (text === '') throw new Error(`Empty section: ${headings[i]}`)
  })

  return {
    history: texts[0],
    people: texts[1],
    economy: texts[2],
    internationalRelations: texts[3],
  }
}
