import './RangeTitle.css'

// Shows a range title from `statRanges.ts` across the full width it is given,
// without its slash: the number at the left and the name at the right, e.g.
// "≥ 10M          Moderate". A title without a slash (e.g. "1.4 Billion", or
// "No data") is centred. `suffix` (e.g. " (est.)") goes after the name. The
// space between the parts is only there for screen readers and tests: a flex
// container doesn't draw it.
export function RangeTitle({ title, suffix = '' }: { title: string; suffix?: string }) {
  const parts = title.split('/')
  if (parts.length !== 2) {
    return (
      <span className="range-title range-title--whole">
        <span>
          {title}
          {suffix}
        </span>
      </span>
    )
  }
  return (
    <span className="range-title">
      <span>{parts[0].trim()}</span>{' '}
      <span>
        {parts[1].trim()}
        {suffix}
      </span>
    </span>
  )
}
