import type { CountryShape } from '../../shared/countries'
import { countryFacts } from '../../shared/countryFacts'
import './CountryInfoPanel.css'

type CountryInfoPanelProps = {
  country: CountryShape
  onClose: () => void
}

// Full numbers with thousands separators, e.g. 66,650,804.
const numberFormat = new Intl.NumberFormat('en')

export function CountryInfoPanel({ country, onClose }: CountryInfoPanelProps) {
  // Facts exist only for the 195 countries; other map areas (e.g. Greenland,
  // Kosovo) have none, either because they have no ISO code or aren't included.
  const facts = country.isoAlpha3 === null ? undefined : countryFacts[country.isoAlpha3]
  const name = facts?.commonName ?? country.name

  return (
    <aside className="country-info-panel" aria-label={`${name} details`}>
      <button className="country-info-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{name}</h2>
      {facts === undefined ? (
        <p className="country-info-panel__note">Not one of the 195 countries in this app.</p>
      ) : (
        <>
          {/* Skip the official name when it's the same, e.g. "Japan". */}
          {facts.officialName !== facts.commonName && (
            <p className="country-info-panel__official-name">{facts.officialName}</p>
          )}
          <dl>
            <dt>{facts.capitals.length === 1 ? 'Capital' : 'Capitals'}</dt>
            <dd>{facts.capitals.join(', ')}</dd>
            <dt>Population</dt>
            <dd>
              {numberFormat.format(facts.population)} ({facts.populationYear})
            </dd>
            <dt>Area</dt>
            <dd>{numberFormat.format(facts.areaKm2)} km²</dd>
            <dt>IHDI</dt>
            <dd>{facts.ihdi === null ? 'No data' : `${facts.ihdi} (${facts.ihdiYear})`}</dd>
          </dl>
        </>
      )}
    </aside>
  )
}
