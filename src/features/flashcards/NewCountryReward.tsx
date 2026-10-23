import { countryFacts } from '../../shared/countryFacts'
import './NewCountryReward.css'

const COUNTRY_TOTAL = Object.keys(countryFacts).length

type NewCountryRewardProps = {
  // The country that has just joined the Passport.
  countryName: string
  // How many countries were in the Passport before it joined.
  countBefore: number
  // The continue button's text, e.g. "Next →" in Classic, "Done" in the Passport.
  continueLabel: string
  onContinue: () => void
}

// The reward for finishing a new country's first card: shows the Passport
// count before it joined, then rolls it down to the new count (the timing is
// in NewCountryReward.css).
export function NewCountryReward({
  countryName,
  countBefore,
  continueLabel,
  onContinue,
}: NewCountryRewardProps) {
  const countAfter = countBefore + 1
  return (
    <div className="new-country-reward">
      <p className="new-country-reward__country">{countryName} ✓</p>
      <p className="new-country-reward__count" aria-label={`${countAfter}/${COUNTRY_TOTAL}`}>
        {/* Wide enough for the longer of the two numbers; the font is monospace. */}
        <span
          className="new-country-reward__window"
          style={{ width: `${String(countAfter).length}ch` }}
          aria-hidden="true"
        >
          <span className="new-country-reward__old">{countBefore}</span>
          <span className="new-country-reward__new">{countAfter}</span>
        </span>
        <span aria-hidden="true">/{COUNTRY_TOTAL}</span>
      </p>
      <button type="button" className="new-country-reward__continue" onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  )
}
