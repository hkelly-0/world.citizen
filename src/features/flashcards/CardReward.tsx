import type { CSSProperties } from 'react'
import { countryFacts } from '../../shared/countryFacts'
import { useClickAnywhereToContinue } from '../../shared/useClickAnywhereToContinue'
import { RecallCircle } from '../passport/RecallCircle'
import { TutorialNote } from '../tutorial/TutorialNote'
import type { CardRewardDetails } from './rewardAfterCard'
import './CardReward.css'

const COUNTRY_TOTAL = Object.keys(countryFacts).length

// The familiarity ring's size here, much larger than on the Passport.
const RING_SIZE = 120

type CardRewardProps = {
  reward: CardRewardDetails
  // The continue button's text, e.g. "Next" in Learn + Practice, "Done" in the Passport.
  continueLabel: string
  // Whether the button gets an arrow: it does when it moves on to another card.
  continueHasArrow: boolean
  // The tutorial's explanation, above the continue button. Only the home
  // country's card has one.
  note?: string
  onContinue: () => void
}

// The reward shown after every finished card, in green with the country's
// name. For a new country (with a ✓), the Passport count before it joined
// rolls down to the new count. Otherwise, the country's familiarity ring
// starts a little below its fill before the card and moves to its new fill. "Perfect" goes under the name when every question on
// the card was answered right, on a card of more than one question
// (`isPerfect`). Both wait a moment first (the timing is in
// CardReward.css and RecallCircle.tsx).
export function CardReward({
  reward,
  continueLabel,
  continueHasArrow,
  note,
  onContinue,
}: CardRewardProps) {
  useClickAnywhereToContinue(true, onContinue)
  const countryName = countryFacts[reward.code].commonName
  return (
    <div className="card-reward">
      {reward.kind === 'new-country' ? (
        <>
          <p className="card-reward__country">{countryName} ✓</p>
          {reward.isPerfect && <Perfect />}
          <PassportCount countBefore={reward.countBefore} isAfterFirework={reward.isPerfect} />
        </>
      ) : (
        <>
          <p className="card-reward__country">{countryName}</p>
          {reward.isPerfect && <Perfect />}
          <RecallCircle
            recall={reward.recall}
            previousRecall={reward.recallBefore}
            size={RING_SIZE}
            isAnimated={true}
          />
        </>
      )}
      {note !== undefined && <TutorialNote text={note} />}
      <button
        type="button"
        className={
          continueHasArrow ? 'card-reward__continue arrow-button' : 'card-reward__continue'
        }
        onClick={onContinue}
        // Focused so Enter presses it.
        autoFocus
      >
        {continueLabel}
      </button>
    </div>
  )
}

// The directions of the sparks from "Perfect"'s right edge, in CSS rotation
// (clockwise from pointing right): evenly from 10° below horizontal to 10°
// short of straight up.
const RIGHT_SPARK_ANGLES = [10, -20, -50, -80]
// The left edge's sparks, mirroring the right's.
const LEFT_SPARK_ANGLES = RIGHT_SPARK_ANGLES.map((angle) => 180 - angle)

// "Perfect", with one burst of white sparks flying out from each side of it,
// which fades out (the timing is in CardReward.css).
function Perfect() {
  return (
    <p className="card-reward__perfect">
      <Sparks side="left" angles={LEFT_SPARK_ANGLES} />
      Perfect
      <Sparks side="right" angles={RIGHT_SPARK_ANGLES} />
    </p>
  )
}

// One side's sparks, starting from that edge of "Perfect".
function Sparks({ side, angles }: { side: 'left' | 'right'; angles: number[] }) {
  return (
    <span className={`card-reward__firework card-reward__firework--${side}`} aria-hidden="true">
      {angles.map((angle) => (
        <span
          key={angle}
          className="card-reward__spark"
          // Read by the spark's CSS, which turns it to face its direction.
          style={{ '--spark-angle': `${angle}deg` } as CSSProperties}
        />
      ))}
    </span>
  )
}

// "X/197", with X rolling down to X + 1. Only the digits that change roll; the
// others stay still (12 → 13 rolls only the 2 to a 3). `isAfterFirework`
// holds the roll until "Perfect"'s sparks have finished.
function PassportCount({
  countBefore,
  isAfterFirework,
}: {
  countBefore: number
  isAfterFirework: boolean
}) {
  const countAfter = countBefore + 1
  const afterDigits = String(countAfter)
  // Padded on the left so the digits line up, e.g. 9 → 10 compares " 9" with "10".
  const beforeDigits = String(countBefore).padStart(afterDigits.length, ' ')
  return (
    <p
      className={
        isAfterFirework
          ? 'card-reward__count card-reward__count--after-firework'
          : 'card-reward__count'
      }
      aria-label={`${countAfter}/${COUNTRY_TOTAL}`}
    >
      {afterDigits.split('').map((afterDigit, position) => {
        const beforeDigit = beforeDigits[position]
        if (beforeDigit === afterDigit) {
          return (
            <span key={position} aria-hidden="true">
              {afterDigit}
            </span>
          )
        }
        // One digit wide; the font is monospace. A padded space rolls out as blank.
        return (
          <span key={position} className="card-reward__window" aria-hidden="true">
            <span className="card-reward__old">{beforeDigit}</span>
            <span className="card-reward__new">{afterDigit}</span>
          </span>
        )
      })}
      <span aria-hidden="true">/{COUNTRY_TOTAL}</span>
    </p>
  )
}
