import type { LinkedTextPart } from '../../shared/countryLinks'
// The link style.
import './CountryInfoPanel.css'

type CountryLinkedTextProps = {
  parts: LinkedTextPart[]
  // Called with a country's ISO alpha-3 code when its name is clicked.
  onSelectCountry?: (isoAlpha3: string) => void
}

// A text with the countries it names shown as links, e.g. a territory's
// subtitle or an info paragraph. Goes inside a <p> or similar.
export function CountryLinkedText({ parts, onSelectCountry }: CountryLinkedTextProps) {
  return parts.map((part, i) =>
    'text' in part ? (
      part.text
    ) : (
      <button
        key={i}
        className="country-info-panel__country-link"
        onClick={() => onSelectCountry?.(part.isoAlpha3)}
      >
        {part.name}
      </button>
    ),
  )
}
