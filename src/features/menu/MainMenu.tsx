import { COUNTRY_COUNT } from '../passport/passport'
import './MainMenu.css'

type MainMenuProps = {
  // How many countries are in the Passport, shown as e.g. "42/195".
  passportCount: number
  onOpenGlobe: () => void
  onOpenFlashcards: () => void
  onOpenPassport: () => void
  onOpenSettings: () => void
}

// The first screen: choose between the flashcards, the globe and the
// passport, with settings at the bottom.
export function MainMenu({
  passportCount,
  onOpenGlobe,
  onOpenFlashcards,
  onOpenPassport,
  onOpenSettings,
}: MainMenuProps) {
  return (
    <main className="main-menu">
      <h1>world.citizen</h1>
      <p className="main-menu__subtitle">learn every country</p>
      <button className="main-menu__option arrow-button" onClick={onOpenFlashcards}>
        Flashcards
      </button>
      <button className="main-menu__option arrow-button" onClick={onOpenGlobe}>
        Globe
      </button>
      <button
        className="main-menu__option main-menu__option--stacked arrow-button"
        onClick={onOpenPassport}
      >
        <span>Passport</span>{' '}
        <span className="main-menu__count">
          {passportCount}/{COUNTRY_COUNT}
        </span>
      </button>
      <button className="main-menu__settings arrow-button" onClick={onOpenSettings}>
        Settings
      </button>
    </main>
  )
}
