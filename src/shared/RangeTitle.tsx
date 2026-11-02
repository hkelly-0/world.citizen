import type { RangeLabel } from './statRanges'
import './RangeTitle.css'

// Shows a range's title across the full width it is given: the bound at the
// left and the name at the right, e.g. "≥ 10M          Moderate". A range with
// no bound (e.g. "1.4 Billion", or "No data") is centred. `suffix` (e.g.
// " (est.)") goes after the name. The space between the parts is only there
// for screen readers and tests: a flex container doesn't draw it.
export function RangeTitle({ range, suffix = '' }: { range: RangeLabel; suffix?: string }) {
  if (range.bound === null) {
    return (
      <span className="range-title range-title--whole">
        <span>
          {range.name}
          {suffix}
        </span>
      </span>
    )
  }
  return (
    <span className="range-title">
      <span>{range.bound}</span>{' '}
      <span>
        {range.name}
        {suffix}
      </span>
    </span>
  )
}
