import type { CSSProperties } from 'react'
import './RecallCircle.css'
import { recallColour, recallFraction } from './recallCircleFill'

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
