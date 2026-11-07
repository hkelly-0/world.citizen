import { useState } from 'react'
import './GlobeSettings.css'

type GlobeSettingsProps = {
  isShowingRegions: boolean
  onShowRegionsChange: (shown: boolean) => void
  isShowingPopulation: boolean
  onShowPopulationChange: (shown: boolean) => void
  isShowingIhdi: boolean
  onShowIhdiChange: (shown: boolean) => void
}

// A gear button under the back button on the globe screen, which opens and
// closes the globe's settings. Nothing here is saved: the globe screen starts
// with every setting off.
export function GlobeSettings({
  isShowingRegions,
  onShowRegionsChange,
  isShowingPopulation,
  onShowPopulationChange,
  isShowingIhdi,
  onShowIhdiChange,
}: GlobeSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="globe-settings">
      <button
        className="globe-settings__gear"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Globe settings"
        aria-expanded={isOpen}
      >
        {/* The "settings" icon from Feather Icons (MIT licence). */}
        <svg className="globe-settings__gear-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {isOpen && (
        <section className="globe-settings__panel" aria-label="Globe settings">
          <label className="globe-settings__row">
            Regions
            <button
              className="globe-settings__switch"
              role="switch"
              aria-checked={isShowingRegions}
              onClick={() => onShowRegionsChange(!isShowingRegions)}
            >
              <span className="globe-settings__switch-knob" />
            </button>
          </label>
          <label className="globe-settings__row">
            Population
            <button
              className="globe-settings__switch"
              role="switch"
              aria-checked={isShowingPopulation}
              onClick={() => onShowPopulationChange(!isShowingPopulation)}
            >
              <span className="globe-settings__switch-knob" />
            </button>
          </label>
          <label className="globe-settings__row">
            IHDI
            <button
              className="globe-settings__switch"
              role="switch"
              aria-checked={isShowingIhdi}
              onClick={() => onShowIhdiChange(!isShowingIhdi)}
            >
              <span className="globe-settings__switch-knob" />
            </button>
          </label>
        </section>
      )}
    </div>
  )
}
