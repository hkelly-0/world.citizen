import { BackButton } from '../../shared/BackButton'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'

type FlashcardsMenuProps = {
  onBack: () => void
  onOpenClassic: () => void
  onOpenCustomPractice: () => void
}

// Shown when Flashcards is chosen on the main menu: full country cards
// (Classic), or a choice of which question types to practise (Custom Practice).
export function FlashcardsMenu({
  onBack,
  onOpenClassic,
  onOpenCustomPractice,
}: FlashcardsMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Flashcards</h1>
      <button className="main-menu__option" onClick={onOpenClassic}>
        Classic Mode
      </button>
      <button className="main-menu__option" onClick={onOpenCustomPractice}>
        Custom Practice
      </button>
    </main>
  )
}
