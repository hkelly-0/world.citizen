import { useLayoutEffect, type RefObject } from 'react'

// The font size in px that fitted text starts at, before any enlargement by
// the browser. Set in CSS too (`.main-menu__title-text` in MainMenu.css).
const STARTING_FONT_SIZE = 32

// Sizes the text so it spans the column exactly, used for "world.citizen" on
// the main menu and the tutorial's welcome, so it looks centred while staying
// left-aligned with the text below. It is measured rather than worked out from
// the font, because some Android browsers (e.g. DuckDuckGo) enlarge text by the
// phone's text size setting. That enlargement is in proportion to the font
// size, so one measurement corrects for it.
// `columnRef` is the element as wide as the column; `textRef` is an
// inline-block element inside it holding only the text, whose font size is set.
export function useFitTextToWidth(
  columnRef: RefObject<HTMLElement | null>,
  textRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    // The font size in px last set on the text.
    let fontSize = STARTING_FONT_SIZE

    function fitText() {
      const column = columnRef.current
      const text = textRef.current
      if (column === null || text === null) {
        return
      }
      const textWidth = text.getBoundingClientRect().width
      // Nothing is laid out yet, so there is nothing to fit.
      if (textWidth === 0) {
        return
      }
      const fittedFontSize = (fontSize * column.clientWidth) / textWidth
      // Already fitted: setting it again would resize the text a fraction of a
      // pixel and run this again, possibly forever.
      if (Math.abs(fittedFontSize - fontSize) < 0.1) {
        return
      }
      fontSize = fittedFontSize
      text.style.fontSize = `${fontSize}px`
    }

    // ResizeObserver is missing in tests.
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    // Fits the text again whenever the column changes width (the window is
    // resized) or the text does (Roboto Mono finishes loading, replacing the
    // wider fallback font, or the browser's text size changes). Also runs
    // once straight away.
    const observer = new ResizeObserver(fitText)
    if (columnRef.current !== null && textRef.current !== null) {
      observer.observe(columnRef.current)
      observer.observe(textRef.current)
    }
    return () => observer.disconnect()
  }, [columnRef, textRef])
}
