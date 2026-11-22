import { useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import { NAMING_AREAS } from './namingGame'
// Same layout as the main menu.
import '../menu/MainMenu.css'
import './NamingAreaMenu.css'

type NamingAreaMenuProps = {
  onBack: () => void
  // Opens Name every country for the chosen area's id.
  onOpenNameEveryCountry: (areaId: string) => void
}

// Shown when Name Every Country is chosen on the Extras menu: a list to pick
// the area to play it in, starting on The World, and Go to start the game.
// The title finishes in the list ("Name Every Country in… Europe"), so it
// labels it.
export function NamingAreaMenu({ onBack, onOpenNameEveryCountry }: NamingAreaMenuProps) {
  const [areaId, setAreaId] = useState(NAMING_AREAS[0].id)

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1 id="naming-area-menu-title">Name Every Country in</h1>
      <select
        className="naming-area-menu__choice"
        aria-labelledby="naming-area-menu-title"
        value={areaId}
        onChange={(event) => setAreaId(event.target.value)}
      >
        {NAMING_AREAS.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <button
        className="naming-area-menu__go arrow-button"
        onClick={() => onOpenNameEveryCountry(areaId)}
      >
        Go
      </button>
    </main>
  )
}
