import { useRef } from 'react'
import { COUNTRY_COUNT } from '../passport/passport'
import './MainMenu.css'
import { SpinningLogo } from './SpinningLogo'
import { useFitTextToWidth } from './useFitTextToWidth'

type MainMenuProps = {
  // How many countries are in the Passport, shown as e.g. "42/195".
  passportCount: number
  // Whether to offer "Play Tutorial" above the options, for new users.
  showTutorialButton: boolean
  onPlayTutorial: () => void
  onOpenGlobe: () => void
  onOpenFlashcards: () => void
  onOpenPassport: () => void
  onOpenExtras: () => void
  onOpenSettings: () => void
}

// The first screen: choose between the flashcards, the globe, the passport
// and the extras, with settings at the bottom.
export function MainMenu({
  passportCount,
  showTutorialButton,
  onPlayTutorial,
  onOpenGlobe,
  onOpenFlashcards,
  onOpenPassport,
  onOpenExtras,
  onOpenSettings,
}: MainMenuProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)
  // Sizes the title so it spans the column exactly.
  useFitTextToWidth(titleRef, titleTextRef)

  return (
    <main className="main-menu">
      <SpinningLogo className="main-menu__logo" />
      <h1 ref={titleRef}>
        <span className="main-menu__title-text" ref={titleTextRef}>
          world.citizen
        </span>
      </h1>
      <p className="main-menu__subtitle">learn every country</p>
      {showTutorialButton && (
        <button className="main-menu__tutorial arrow-button" onClick={onPlayTutorial}>
          Play Tutorial
        </button>
      )}
      <div className="main-menu__options">
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
        <button className="main-menu__option arrow-button" onClick={onOpenExtras}>
          Extras
        </button>
      </div>
      <button className="main-menu__settings arrow-button" onClick={onOpenSettings}>
        Settings
      </button>
    </main>
  )
}
