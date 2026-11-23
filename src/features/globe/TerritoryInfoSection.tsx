import { useEffect, useId, useState } from 'react'
import { linkedTextParts } from '../../shared/countryLinks'
import { loadTerritoryInfo, TERRITORY_INFO_HEADING } from '../../shared/territoryInfo'
import { CountryLinkedText } from './CountryLinkedText'
// Styled the same as a country's paragraphs.
import './CountryInfoSections.css'

type TerritoryInfoSectionProps = {
  // The area's key in territorySubtitles.json; it must have a file
  // (hasTerritoryInfo).
  territoryKey: string
  // Called with a country's ISO alpha-3 code when its name in the paragraph
  // is clicked.
  onSelectCountry?: (isoAlpha3: string) => void
}

// The hand-written paragraph about a map area outside the 197 countries,
// under a "More info" heading that opens and closes it, like a country's
// paragraphs (CountryInfoSections). Starts closed. The parent should key this
// by area, so a newly selected area starts closed again.
export function TerritoryInfoSection({ territoryKey, onSelectCountry }: TerritoryInfoSectionProps) {
  // Undefined until the area's file has loaded.
  const [info, setInfo] = useState<string | undefined>(undefined)
  const [isOpen, setIsOpen] = useState(false)
  const paragraphId = useId()

  // The heading shows straight away, so the globe can measure the panel's
  // full closed height; the text only has to arrive before it is opened.
  useEffect(() => {
    let cancelled = false
    loadTerritoryInfo(territoryKey).then((loaded) => {
      if (!cancelled) setInfo(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [territoryKey])

  return (
    <div className="country-info-sections">
      <section>
        <h3>
          <button
            className="country-info-sections__heading"
            aria-expanded={isOpen}
            aria-controls={paragraphId}
            onClick={() => setIsOpen(!isOpen)}
          >
            {TERRITORY_INFO_HEADING}
          </button>
        </h3>
        <p id={paragraphId} className="country-info-sections__paragraph" hidden={!isOpen}>
          {info !== undefined && (
            <CountryLinkedText parts={linkedTextParts(info)} onSelectCountry={onSelectCountry} />
          )}
        </p>
      </section>
    </div>
  )
}
