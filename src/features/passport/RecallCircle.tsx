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

const SIZE = 20
const STROKE_WIDTH = 4
const RADIUS = (SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// A small "health" ring showing how likely the user is to remember a country
// in 14 days: filled clockwise from the top, and coloured, by its recall chance
// (see `countryRecall`). An empty grey ring when the country has none.
export function RecallCircle({ recall }: { recall: number | null }) {
  const label =
    recall === null ? 'No familiarity yet' : `Familiarity ${Math.round(recall * 100)}%`
  return (
    <svg
      className="recall-circle"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label}
    >
      <circle className="recall-circle__track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
      {recall !== null && (
        <circle
          className="recall-circle__fill"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={recallColour(recall)}
          // A dash as long as the filled part, then a gap for the rest.
          strokeDasharray={`${recallFraction(recall) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      )}
    </svg>
  )
}
