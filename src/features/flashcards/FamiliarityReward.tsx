import { RecallCircle } from '../passport/RecallCircle'
import './NewCountryReward.css'

// The ring's size here, much larger than on the Passport.
const RING_SIZE = 120

type FamiliarityRewardProps = {
  // The country whose card was just finished; already in the Passport.
  countryName: string
  // Its familiarity after the card (`countryRecall` for the questions learned
  // in Settings), the same value as its ring on the Passport.
  recall: number | null
  // The continue button's text, e.g. "Next →" in Classic, "Done" in the Passport.
  continueLabel: string
  onContinue: () => void
}

// The reward for finishing the card of a country already in the Passport:
// its familiarity ring filling up from empty to the new value. Laid out like
// the new-country reward (`NewCountryReward`), so it reuses its styles.
export function FamiliarityReward({
  countryName,
  recall,
  continueLabel,
  onContinue,
}: FamiliarityRewardProps) {
  return (
    <div className="new-country-reward">
      <p className="new-country-reward__country">{countryName}</p>
      <RecallCircle recall={recall} size={RING_SIZE} isAnimated={true} />
      <button type="button" className="new-country-reward__continue" onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  )
}
