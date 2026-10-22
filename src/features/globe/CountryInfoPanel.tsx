import type { Ref } from 'react'
import type { CountryShape } from '../../shared/countries'
import { countryFacts } from '../../shared/countryFacts'
import { AREA_RANGES, IHDI_RANGES, POPULATION_RANGES, rangeTitle } from '../../shared/statRanges'
import './CountryInfoPanel.css'

type CountryInfoPanelProps = {
  country: CountryShape
  onClose: () => void
  // Lets the globe measure the panel, to centre a country in the space above it.
  ref?: Ref<HTMLElement>
}

export function CountryInfoPanel({ country, onClose, ref }: CountryInfoPanelProps) {
  // Facts exist only for the 195 countries; other map areas (e.g. Greenland,
  // Kosovo) have none, either because they have no ISO code or aren't included.
  const facts = country.isoAlpha3 === null ? undefined : countryFacts[country.isoAlpha3]
  const name = facts?.commonName ?? country.name

  return (
    <aside ref={ref} className="country-info-panel" aria-label={`${name} details`}>
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
            <dd>{rangeTitle(POPULATION_RANGES, facts.population)}</dd>
            <dt>Area</dt>
            <dd>{rangeTitle(AREA_RANGES, facts.areaKm2)}</dd>
            <dt>IHDI</dt>
            <dd>{facts.ihdi === null ? 'No data' : rangeTitle(IHDI_RANGES, facts.ihdi)}</dd>
          </dl>
        </>
      )}
    </aside>
  )
}
