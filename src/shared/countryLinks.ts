// Links to countries written into the info paragraphs (countryInfo/ and
// territoryInfo/) as "[shown text]{ISO}", e.g. "[the US]{USA}'s closest ally".
// The text in brackets is shown as written, as a link to the country with
// that ISO alpha-3 code.

// One piece of a text: plain text, or a country's name shown as a link to it.
export type LinkedTextPart = { text: string } | { isoAlpha3: string; name: string }

// A link: the shown text, then the code.
const LINK_PATTERN = /\[([^\]]+)\]\{([A-Z]{3})\}/

// Splits a text into plain text and links, e.g. "[Japan]{JPN}'s ally" gives
// [{ isoAlpha3: 'JPN', name: 'Japan' }, { text: "'s ally" }].
export function linkedTextParts(text: string): LinkedTextPart[] {
  // Splitting on a pattern with two capture groups keeps both, so the pieces
  // repeat in threes: text, shown text, code, text, shown text, code, ..., text.
  const pieces = text.split(new RegExp(LINK_PATTERN, 'g'))
  const parts: LinkedTextPart[] = []
  pieces.forEach((piece, i) => {
    if (i % 3 === 0) {
      if (piece !== '') parts.push({ text: piece })
    } else if (i % 3 === 2) {
      parts.push({ isoAlpha3: piece, name: pieces[i - 1] })
    }
  })
  return parts
}

// The text as read, with each link replaced by its shown text.
export function withoutLinks(text: string): string {
  return text.replace(new RegExp(LINK_PATTERN, 'g'), '$1')
}

// The codes of the countries a text links to, in order, repeats included.
export function linkedCountryCodes(text: string): string[] {
  return [...text.matchAll(new RegExp(LINK_PATTERN, 'g'))].map((match) => match[2])
}
