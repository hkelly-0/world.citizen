import { useLayoutEffect, useRef } from 'react'
import { COUNTRY_COUNT } from '../passport/passport'
import './MainMenu.css'
import { SpinningLogo } from './SpinningLogo'

type MainMenuProps = {
  // How many countries are in the Passport, shown as e.g. "42/195".
  passportCount: number
  onOpenGlobe: () => void
  onOpenFlashcards: () => void
  onOpenPassport: () => void
  onOpenSettings: () => void
}

// The first screen: choose between the flashcards, the globe, the passport
// and the extras, with settings at the bottom.
export function MainMenu({
  passportCount,
  onOpenGlobe,
  onOpenFlashcards,
  onOpenPassport,
  onOpenSettings,
}: MainMenuProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)

  // Sizes the title so its text spans the column exactly, so it looks centred
  // while staying left-aligned with the subtitle. It is measured rather than
  // worked out from the font, because some Android browsers (e.g. DuckDuckGo)
  // enlarge text by the phone's text size setting. That enlargement is in
  // proportion to the font size, so one measurement corrects for it.
  useLayoutEffect(() => {
    // The font size in px last set on the title, before any enlargement by
    // the browser. The CSS sets the same starting size.
    let fontSize = 32

    function fitTitle() {
      const title = titleRef.current
      const titleText = titleTextRef.current
      if (title === null || titleText === null) {
        return
      }
      const textWidth = titleText.getBoundingClientRect().width
      // Nothing is laid out yet, so there is nothing to fit.
      if (textWidth === 0) {
        return
      }
      const fittedFontSize = (fontSize * title.clientWidth) / textWidth
      // Already fitted: setting it again would resize the text a fraction of a
      // pixel and run this again, possibly forever.
      if (Math.abs(fittedFontSize - fontSize) < 0.1) {
        return
      }
      fontSize = fittedFontSize
      title.style.fontSize = `${fontSize}px`
    }

    // ResizeObserver is missing in tests.
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    // Fits the title again whenever the column changes width (the window is
    // resized) or the text does (Roboto Mono finishes loading, replacing the
    // wider fallback font, or the browser's text size changes). Also runs
    // once straight away.
    const observer = new ResizeObserver(fitTitle)
    if (titleRef.current !== null && titleTextRef.current !== null) {
      observer.observe(titleRef.current)
      observer.observe(titleTextRef.current)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <main className="main-menu">
      <SpinningLogo className="main-menu__logo" />
      <h1 ref={titleRef}>
        <span className="main-menu__title-text" ref={titleTextRef}>
          world.citizen
        </span>
      </h1>
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
      {/* Leads nowhere yet. */}
      <button className="main-menu__option arrow-button">Extras</button>
      <button className="main-menu__settings arrow-button" onClick={onOpenSettings}>
        Settings
      </button>
    </main>
  )
}
