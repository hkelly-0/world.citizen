import { BackButton } from '../../shared/BackButton'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'

type ExtrasMenuProps = {
  onBack: () => void
  onOpenNameEveryCountry: () => void
}

// Shown when Extras is chosen on the main menu: games outside the flashcards,
// which don't touch the user's progress.
export function ExtrasMenu({ onBack, onOpenNameEveryCountry }: ExtrasMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Extras</h1>
      <button className="main-menu__option arrow-button" onClick={onOpenNameEveryCountry}>
        Name every country
      </button>
    </main>
  )
}
