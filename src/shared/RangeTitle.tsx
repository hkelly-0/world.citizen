import type { ReactNode } from 'react'
import type { RangeLabel } from './statRanges'
import './RangeTitle.css'

// Shows a range's title across the full width it is given: the bound at the
// left and the name at the right, e.g. "10-50M          Moderate". A title with
// no bound (e.g. "No data") is centred. `suffix` (e.g. " (est.)") goes after
// the name, and `afterBound` (e.g. a button) right after the bound. The space
// between the parts is only there
// for screen readers and tests: a flex container doesn't draw it.
export function RangeTitle({
  range,
  suffix = '',
  afterBound,
}: {
  range: RangeLabel
  suffix?: string
  afterBound?: ReactNode
}) {
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
      <span>
        {range.bound}
        {afterBound}
      </span>{' '}
      <span>
        {range.name}
        {suffix}
      </span>
    </span>
  )
}
