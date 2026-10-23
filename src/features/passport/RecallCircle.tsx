import type { CSSProperties } from 'react'
import './RecallCircle.css'

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
  const fullness = (recallFraction(recall) - 1 / 6) / (5 / 6)
  return `hsl(${Math.round(fullness * 120)}, 80%, 50%)`
}

// The Passport's size; the familiarity reward passes a larger one.
const DEFAULT_SIZE = 20
// The ring's thickness as a share of its size.
const STROKE_WIDTH_RATIO = 0.2

type RecallCircleProps = {
  recall: number | null
  size?: number
  // Fills clockwise from empty up to `recall` when first shown (the timing is
  // in RecallCircle.css).
  isAnimated?: boolean
}

// A small "health" ring showing how likely the user is to remember a country
// in 14 days: filled clockwise from the top, and coloured, by its recall chance
// (see `countryRecall`). An empty grey ring when the country has none.
export function RecallCircle({
  recall,
  size = DEFAULT_SIZE,
  isAnimated = false,
}: RecallCircleProps) {
  const label = recall === null ? 'No familiarity yet' : `Familiarity ${Math.round(recall * 100)}%`
  const strokeWidth = size * STROKE_WIDTH_RATIO
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filledLength = recall === null ? 0 : recallFraction(recall) * circumference
  return (
    <svg
      className="recall-circle"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
    >
      <circle
        className="recall-circle__track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      {recall !== null && (
        <circle
          className={
            isAnimated ? 'recall-circle__fill recall-circle__fill--animated' : 'recall-circle__fill'
          }
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={recallColour(recall)}
          // A dash as long as the filled part, then a gap for the rest.
          strokeDasharray={`${filledLength} ${circumference}`}
          // Where the animation starts: the dash shifted back out of sight.
          style={{ '--recall-circle-filled-length': filledLength } as CSSProperties}
        />
      )}
    </svg>
  )
}
