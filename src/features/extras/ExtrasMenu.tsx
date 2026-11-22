import { BackButton } from '../../shared/BackButton'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'

type ExtrasMenuProps = {
  onBack: () => void
  // Opens the menu of areas to play Name every country in.
  onOpenNameEveryCountry: () => void
  // Opens the table of every country's stats.
  onOpenCountryTable: () => void
  // Opens the page explaining which countries the app counts.
  onOpenWhatCountsAsCountry: () => void
}

// Shown when Extras is chosen on the main menu: games outside the flashcards,
// which don't touch the user's progress. One button opens the table of every
// country's stats, one the page explaining which countries the app counts,
// and one Name every country's menu of areas.
export function ExtrasMenu({
  onBack,
  onOpenNameEveryCountry,
  onOpenCountryTable,
  onOpenWhatCountsAsCountry,
}: ExtrasMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Extras</h1>
      <div className="main-menu__options">
        <button className="main-menu__option arrow-button" onClick={onOpenCountryTable}>
          All country data
        </button>
        <button className="main-menu__option arrow-button" onClick={onOpenWhatCountsAsCountry}>
          What counts as a country?
        </button>
        <button className="main-menu__option arrow-button" onClick={onOpenNameEveryCountry}>
          Game: Name Every Country
        </button>
      </div>
    </main>
  )
}
