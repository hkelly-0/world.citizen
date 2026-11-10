import { BackButton } from '../../shared/BackButton'
import { NAMING_AREAS } from './namingGame'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'
import './ExtrasMenu.css'

type ExtrasMenuProps = {
  onBack: () => void
  // Opens Name every country for the chosen area's id.
  onOpenNameEveryCountry: (areaId: string) => void
  // Opens the table of every country's stats.
  onOpenCountryTable: () => void
}

// Shown when Extras is chosen on the main menu: games outside the flashcards,
// which don't touch the user's progress. Name every country has one button
// per area, under a heading that the buttons finish ("Name every country
// in… Europe"). Above them, one button opens the table of every country's
// stats.
export function ExtrasMenu({
  onBack,
  onOpenNameEveryCountry,
  onOpenCountryTable,
}: ExtrasMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Extras</h1>
      <div className="main-menu__options">
        <button className="main-menu__option arrow-button" onClick={onOpenCountryTable}>
          Table of all country stats
        </button>
      </div>
      <h2 className="extras-menu__heading">Name every country in…</h2>
      <div className="main-menu__options">
        {NAMING_AREAS.map((area) => (
          <button
            key={area.id}
            className="main-menu__option arrow-button"
            onClick={() => onOpenNameEveryCountry(area.id)}
          >
            {area.name}
          </button>
        ))}
      </div>
    </main>
  )
}
