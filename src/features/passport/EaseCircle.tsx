import { MINIMUM_EASE_FACTOR } from '../flashcards/sm2'
import './EaseCircle.css'

// The ease at which the circle is completely full and green.
const FULL_EASE = 2.7

// How much of the circle is filled, from 1/6 at the lowest ease (1.3) to all
// of it at FULL_EASE or above, in a straight line between.
export function easeFraction(ease: number): number {
  const progress = (ease - MINIMUM_EASE_FACTOR) / (FULL_EASE - MINIMUM_EASE_FACTOR)
  const clamped = Math.min(1, Math.max(0, progress))
  return 1 / 6 + (5 / 6) * clamped
}

// The circle's colour: a hue from red (0°) at the lowest ease, through orange
// and yellow, to green (120°) when full.
export function easeColour(ease: number): string {
  const fullness = (easeFraction(ease) - 1 / 6) / (5 / 6)
  return `hsl(${Math.round(fullness * 120)}, 80%, 50%)`
}

const SIZE = 20
const STROKE_WIDTH = 4
const RADIUS = (SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// A small "health" ring showing how easy the user finds a country: filled
// clockwise from the top, and coloured, by its ease (see `countryEase`). An
// empty grey ring when the country has no ease.
export function EaseCircle({ ease }: { ease: number | null }) {
  const label = ease === null ? 'No ease yet' : `Ease ${ease.toFixed(1)}`
  return (
    <svg
      className="ease-circle"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label}
    >
      <circle className="ease-circle__track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
      {ease !== null && (
        <circle
          className="ease-circle__fill"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={easeColour(ease)}
          // A dash as long as the filled part, then a gap for the rest.
          strokeDasharray={`${easeFraction(ease) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      )}
    </svg>
  )
}
