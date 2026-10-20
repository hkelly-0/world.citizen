import type { CountryShape } from '../../shared/countries'
import './CountryInfoPanel.css'

type CountryInfoPanelProps = {
  country: CountryShape
  onClose: () => void
}

export function CountryInfoPanel({ country, onClose }: CountryInfoPanelProps) {
  return (
    <aside className="country-info-panel" aria-label={`${country.name} details`}>
      <button className="country-info-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{country.name}</h2>
      <dl>
        <dt>ISO alpha-3</dt>
        <dd>{country.isoAlpha3 ?? 'None'}</dd>
        <dt>ISO numeric</dt>
        <dd>{country.isoNumeric ?? 'None'}</dd>
      </dl>
    </aside>
  )
}
