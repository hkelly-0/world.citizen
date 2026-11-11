import { BackButton } from '../../shared/BackButton'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'

type FlashcardsMenuProps = {
  // Whether to offer "Play Tutorial" (the same offer as the main menu's), with
  // Classic Mode and Custom Practice disabled until it is finished or skipped.
  showTutorialButton: boolean
  onPlayTutorial: () => void
  onBack: () => void
  onOpenClassic: () => void
  onOpenCustomPractice: () => void
}

// Shown when Flashcards is chosen on the main menu: full country cards
// (Classic), or a choice of which question types to practice (Custom Practice).
export function FlashcardsMenu({
  showTutorialButton,
  onPlayTutorial,
  onBack,
  onOpenClassic,
  onOpenCustomPractice,
}: FlashcardsMenuProps) {
  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Flashcards</h1>
      {showTutorialButton && (
        <button className="main-menu__tutorial arrow-button" onClick={onPlayTutorial}>
          Play Tutorial
        </button>
      )}
      <button
        className="main-menu__option arrow-button"
        disabled={showTutorialButton}
        onClick={onOpenClassic}
      >
        Classic Mode
      </button>
      <button
        className="main-menu__option arrow-button"
        disabled={showTutorialButton}
        onClick={onOpenCustomPractice}
      >
        Custom Practice
      </button>
    </main>
  )
}
