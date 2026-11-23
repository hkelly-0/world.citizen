// How full RecallCircle's ring is, and its colour, for a recall chance. Kept
// out of RecallCircle.tsx so that file exports only components.

// At or below this recall chance the circle shows its smallest fill, in red.
// A question just answered wrong is about 52% likely to be remembered in 14
// days (see `countryRecall`), so starting here spreads countries out.
const LOWEST_RECALL = 0.5

// How much of the circle is filled, from 1/6 at a recall chance of 50% or less
// to all of it at 100%, in a straight line between.
export function recallFraction(recall: number): number {
  const progress = (recall - LOWEST_RECALL) / (1 - LOWEST_RECALL)
  const clamped = Math.min(1, Math.max(0, progress))
  return 1 / 6 + (5 / 6) * clamped
}

// The circle's colour: a hue from red (0°) at the smallest fill, through orange
// and yellow, to green (120°) when full.
export function recallColour(recall: number): string {
  return fractionColour(recallFraction(recall))
}

// The colour for a fill of `fraction` of the circle, as in `recallColour`. A
// fill below the smallest one (only while animating) stays red.
export function fractionColour(fraction: number): string {
  const fullness = Math.max(0, (fraction - 1 / 6) / (5 / 6))
  return `hsl(${Math.round(fullness * 120)}, 80%, 50%)`
}

// How much less of the circle than the previous recall chance's fill the
// reward's animation starts from, so the ring always moves, even when the
// recall chance hasn't changed.
const START_BELOW_PREVIOUS = 0.1

// Where the reward's animation starts: a little below `previousRecall`'s fill,
// or empty when there was no recall chance before.
export function animationStartFraction(previousRecall: number | null): number {
  if (previousRecall === null) return 0
  return Math.max(0, recallFraction(previousRecall) - START_BELOW_PREVIOUS)
}
