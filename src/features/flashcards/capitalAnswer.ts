// Lower-cases and removes accents, e.g. "Bogotá" -> "bogota", and ignores
// spaces at either end. Spelling must otherwise match exactly.
function normalise(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // "NFD" splits letters like "á" into "a" plus a separate accent mark,
      // which the next line then removes.
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
  )
}

// True if the typed answer matches any one of the country's capitals.
export function isCapitalCorrect(typed: string, capitals: string[]): boolean {
  return capitals.some((capital) => normalise(capital) === normalise(typed))
}
