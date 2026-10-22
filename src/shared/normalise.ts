// Lower-cases and removes accents, e.g. "Bogotá" -> "bogota", and ignores
// spaces at either end. Spelling must otherwise match exactly.
export function normalise(text: string): string {
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
