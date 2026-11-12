import { useEffect, useId, useState } from 'react'
import { loadTerritoryInfo, TERRITORY_INFO_HEADING } from '../../shared/territoryInfo'
// Styled the same as a country's paragraphs.
import './CountryInfoSections.css'

type TerritoryInfoSectionProps = {
  // The area's key in territorySubtitles.json; it must have a file
  // (hasTerritoryInfo).
  territoryKey: string
}

// The hand-written paragraph about a map area outside the 197 countries,
// under a "More info" heading that opens and closes it, like a country's
// paragraphs (CountryInfoSections). Starts closed. The parent should key this
// by area, so a newly selected area starts closed again.
export function TerritoryInfoSection({ territoryKey }: TerritoryInfoSectionProps) {
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
          {info}
        </p>
      </section>
    </div>
  )
}
