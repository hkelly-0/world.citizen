import { BackButton } from '../../shared/BackButton'
import { NAMING_AREAS } from './namingGame'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'
import './ExtrasMenu.css'

type ExtrasMenuProps = {
  onBack: () => void
  // Opens Name every country for the chosen area's id.
  onOpenNameEveryCountry: (areaId: string) => void
}

// Shown when Extras is chosen on the main menu: games outside the flashcards,
// which don't touch the user's progress. Name every country has one button
// per area, under a heading that the buttons finish ("Name every country
// in… Europe").
export function ExtrasMenu({ onBack, onOpenNameEveryCountry }: ExtrasMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Extras</h1>
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
