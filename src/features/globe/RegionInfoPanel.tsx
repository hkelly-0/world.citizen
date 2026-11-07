import type { Ref } from 'react'
import { COUNTRY_GROUPS, countryDisplayName } from '../../shared/countryFacts'
import { COUNTRY_SHAPES, countryIndicesInGroup } from './countryMap'
import './CountryInfoPanel.css'
import './RegionInfoPanel.css'

type RegionInfoPanelProps = {
  groupId: string
  onClose: () => void
  // Called with the position in COUNTRY_SHAPES of the country whose name was clicked.
  onSelectCountry: (countryIndex: number) => void
  // Lets the globe measure the panel, to fit the region in the space above it.
  ref?: Ref<HTMLElement>
}

// The globe screen's panel for a selected region (country group), shown while
// Regions is on: the region's name and its countries in alphabetical
// order. Styled like the country info panel.
export function RegionInfoPanel({ groupId, onClose, onSelectCountry, ref }: RegionInfoPanelProps) {
  const name = COUNTRY_GROUPS.find((group) => group.id === groupId)?.name ?? ''
  const countries = countryIndicesInGroup(groupId)
    .map((index) => ({ index, name: countryDisplayName(COUNTRY_SHAPES[index]) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <aside ref={ref} className="country-info-panel" aria-label={`${name} details`}>
      <button className="country-info-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{name}</h2>
      <ul className="region-info-panel__countries">
        {countries.map((country) => (
          <li key={country.index}>
            <button
              className="country-info-panel__country-link"
              onClick={() => onSelectCountry(country.index)}
            >
              {country.name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
