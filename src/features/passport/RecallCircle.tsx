import { useEffect, useState } from 'react'
import './RecallCircle.css'
import { animationStartFraction, fractionColour, recallFraction } from './recallCircleFill'

// The Passport's size; the familiarity reward passes a larger one.
const DEFAULT_SIZE = 20
// The ring's thickness as a share of its size.
const STROKE_WIDTH_RATIO = 0.2
// How long the animated ring waits at its starting fill, then how long it
// takes to reach `recall`, in milliseconds.
const ANIMATION_PAUSE_MS = 600
const ANIMATION_FILL_MS = 1000

type RecallCircleProps = {
  recall: number | null
  size?: number
  // When first shown, starts a little below `previousRecall` (or empty when it
  // is null), waits a moment, then moves to `recall`, up or down, its colour
  // changing with it.
  isAnimated?: boolean
  previousRecall?: number | null
}

// A small "health" ring showing how likely the user is to remember a country
// in 14 days: filled clockwise from the top, and coloured, by its recall chance
// (see `countryRecall`). An empty grey ring when the country has none.
export function RecallCircle({
  recall,
  size = DEFAULT_SIZE,
  isAnimated = false,
  previousRecall = null,
}: RecallCircleProps) {
  const label = recall === null ? 'No familiarity yet' : `Familiarity ${Math.round(recall * 100)}%`
  const strokeWidth = size * STROKE_WIDTH_RATIO
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const endFraction = recall === null ? 0 : recallFraction(recall)
  const startFraction = animationStartFraction(previousRecall)
  // The animated ring's fill so far, updated every animation frame.
  const [animatedFraction, setAnimatedFraction] = useState(startFraction)
  useEffect(() => {
    if (!isAnimated) return
    let frame = 0
    let firstFrameTime: number | null = null
    const step = (now: number) => {
      if (firstFrameTime === null) firstFrameTime = now
      const elapsed = now - firstFrameTime - ANIMATION_PAUSE_MS
      const progress = Math.min(1, Math.max(0, elapsed / ANIMATION_FILL_MS))
      setAnimatedFraction(startFraction + (endFraction - startFraction) * easeInOut(progress))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [isAnimated, startFraction, endFraction])
  const shownFraction = isAnimated ? animatedFraction : endFraction

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
          className="recall-circle__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={fractionColour(shownFraction)}
          // A dash as long as the filled part, then a gap for the rest.
          strokeDasharray={`${shownFraction * circumference} ${circumference}`}
        />
      )}
    </svg>
  )
}

// Slow at the start and end, fast in the middle, like CSS's ease-in-out:
// `progress` and the result both run from 0 to 1.
function easeInOut(progress: number): number {
  return progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2
}
