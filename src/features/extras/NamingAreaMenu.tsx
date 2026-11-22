import { BackButton } from '../../shared/BackButton'
import { NAMING_AREAS } from './namingGame'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'

type NamingAreaMenuProps = {
  onBack: () => void
  // Opens Name every country for the chosen area's id.
  onOpenNameEveryCountry: (areaId: string) => void
}

// Shown when Name Every Country is chosen on the Extras menu: one button per
// area to play it in.
export function NamingAreaMenu({ onBack, onOpenNameEveryCountry }: NamingAreaMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Name Every Country in</h1>
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
