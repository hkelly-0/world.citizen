import './MainMenu.css'

type MainMenuProps = {
  onOpenGlobe: () => void
  onOpenFlashcards: () => void
}

// The first screen: choose between the globe and the flashcards.
export function MainMenu({ onOpenGlobe, onOpenFlashcards }: MainMenuProps) {
  return (
    <main className="main-menu">
      <h1>world.citizen</h1>
      <p className="main-menu__subtitle">learn every country</p>
      <button className="main-menu__option" onClick={onOpenGlobe}>
        Globe
      </button>
      <button className="main-menu__option" onClick={onOpenFlashcards}>
        Flashcards
      </button>
    </main>
  )
}
