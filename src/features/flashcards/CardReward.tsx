import { countryFacts } from '../../shared/countryFacts'
import { RecallCircle } from '../passport/RecallCircle'
import type { CardRewardDetails } from './rewardAfterCard'
import './CardReward.css'

const COUNTRY_TOTAL = Object.keys(countryFacts).length

// The familiarity ring's size here, much larger than on the Passport.
const RING_SIZE = 120

type CardRewardProps = {
  reward: CardRewardDetails
  // The continue button's text, e.g. "Next" in Classic, "Done" in the Passport.
  continueLabel: string
  // Whether the button gets an arrow: it does when it moves on to another card.
  continueHasArrow: boolean
  onContinue: () => void
}

// The reward shown after every finished card, in green with the country's
// name. For a new country (with a ✓), the Passport count before it joined
// rolls down to the new count. Otherwise, the country's familiarity ring fills
// clockwise from empty. Both wait a moment first (the timing is in
// CardReward.css and RecallCircle.css).
export function CardReward({
  reward,
  continueLabel,
  continueHasArrow,
  onContinue,
}: CardRewardProps) {
  const countryName = countryFacts[reward.code].commonName
  return (
    <div className="card-reward">
      {reward.kind === 'new-country' ? (
        <>
          <p className="card-reward__country">{countryName} ✓</p>
          <PassportCount countBefore={reward.countBefore} />
        </>
      ) : (
        <>
          <p className="card-reward__country">{countryName}</p>
          <RecallCircle recall={reward.recall} size={RING_SIZE} isAnimated={true} />
        </>
      )}
      <button
        type="button"
        className={
          continueHasArrow ? 'card-reward__continue arrow-button' : 'card-reward__continue'
        }
        onClick={onContinue}
      >
        {continueLabel}
      </button>
    </div>
  )
}

// "X/195", with X rolling down to X + 1.
function PassportCount({ countBefore }: { countBefore: number }) {
  const countAfter = countBefore + 1
  return (
    <p className="card-reward__count" aria-label={`${countAfter}/${COUNTRY_TOTAL}`}>
      {/* Wide enough for the longer of the two numbers; the font is monospace. */}
      <span
        className="card-reward__window"
        style={{ width: `${String(countAfter).length}ch` }}
        aria-hidden="true"
      >
        <span className="card-reward__old">{countBefore}</span>
        <span className="card-reward__new">{countAfter}</span>
      </span>
      <span aria-hidden="true">/{COUNTRY_TOTAL}</span>
    </p>
  )
}
