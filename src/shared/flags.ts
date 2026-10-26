// Flags downloaded by scripts/make-flags.mjs, one SVG per country, each in
// its real proportions (so not all the same shape).
export function flagImageSrc(isoAlpha3: string): string {
  return `/flags/${isoAlpha3}.svg`
}
