import { useEffect } from 'react'
import { BackButton } from '../../shared/BackButton'
import { ArrowLabel } from '../../shared/ArrowLabel'
// Same layout and buttons as the main menu.
import '../menu/MainMenu.css'

type FlashcardsMenuProps = {
  // Whether to offer "Play Tutorial" (the same offer as the main menu's), with
  // the other options disabled until it is finished or skipped.
  showTutorialButton: boolean
  onPlayTutorial: () => void
  onBack: () => void
  onOpenClassic: () => void
  onOpenPassportPractice: () => void
  onOpenCustomPractice: () => void
}

// Shown when Flashcards is chosen on the main menu: full country cards
// (Learn + Practice), the same cards for Passport countries only (Practice My Passport),
// or a choice of which question types to practice (Custom Practice).
export function FlashcardsMenu({
  showTutorialButton,
  onPlayTutorial,
  onBack,
  onOpenClassic,
  onOpenPassportPractice,
  onOpenCustomPractice,
}: FlashcardsMenuProps) {
  // Starts loading the globes a flashcard screen opens with (lazy-loaded in
  // Flashcard.tsx and FlashcardsView.tsx) while the user picks a mode, so the
  // first card's globe doesn't wait for MapLibre and the border data. Each
  // import is shared with its lazy component, so it is only fetched once. A
  // failure is ignored here: the lazy load tries again when the globe is shown.
  useEffect(() => {
    import('../globe/LocateCountryGlobe').catch(() => {})
    import('../globe/NameCountryGlobe').catch(() => {})
    import('../globe/RegionGlobe').catch(() => {})
  }, [])

  return (
    <main className="main-menu">
      <BackButton onClick={onBack} />
      <h1>Flashcards</h1>
      {showTutorialButton && (
        <button className="main-menu__tutorial" onClick={onPlayTutorial}>
          <ArrowLabel>Play Tutorial</ArrowLabel>
        </button>
      )}
      <button
        className="main-menu__option main-menu__option--primary"
        disabled={showTutorialButton}
        onClick={onOpenClassic}
      >
        <ArrowLabel>Learn + Practice</ArrowLabel>
      </button>
      <button
        className="main-menu__option"
        disabled={showTutorialButton}
        onClick={onOpenPassportPractice}
      >
        <ArrowLabel>Practice My Passport</ArrowLabel>
      </button>
      <button
        className="main-menu__option"
        disabled={showTutorialButton}
        onClick={onOpenCustomPractice}
      >
        <ArrowLabel>Custom Practice</ArrowLabel>
      </button>
    </main>
  )
}
