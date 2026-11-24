import { useLayoutEffect, useRef, type ReactNode } from 'react'
import './ArrowLabel.css'

// The label of a button that moves on to something else and whose text can
// wrap (one-word labels use .arrow-button in index.css instead): its text with
// an arrow after it. When the text wraps,
// the arrow sits just to the right of the longest line, vertically centred
// beside the text. CSS can't do that by itself, as wrapped text fills the
// whole width it's allowed, so the text is narrowed to its longest line by
// measuring the lines after layout.
export function ArrowLabel({ children }: { children: ReactNode }) {
  const textRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const text = textRef.current
    // The button the label is in, whose width decides where the text wraps.
    const button = text?.closest('button')
    // ResizeObserver is missing in tests.
    if (text == null || button == null || typeof ResizeObserver === 'undefined') {
      return
    }

    function fitToLongestLine() {
      if (text === null) {
        return
      }
      // Lets the text wrap at the full width first, then measures each line.
      text.style.width = ''
      const range = document.createRange()
      range.selectNodeContents(text)
      // A line can come back as more than one rectangle, so the rectangles
      // are grouped by line (their top) and each line's ends are kept.
      const lineEnds = new Map<number, { left: number; right: number }>()
      for (const rect of range.getClientRects()) {
        const top = Math.round(rect.top)
        const ends = lineEnds.get(top)
        lineEnds.set(top, {
          left: Math.min(ends?.left ?? rect.left, rect.left),
          right: Math.max(ends?.right ?? rect.right, rect.right),
        })
      }
      let longestLine = 0
      for (const { left, right } of lineEnds.values()) {
        longestLine = Math.max(longestLine, right - left)
      }
      // Nothing is laid out yet, so there is nothing to fit.
      if (longestLine === 0) {
        return
      }
      // Rounded up so the longest line still fits and doesn't wrap again.
      text.style.width = `${Math.ceil(longestLine)}px`
    }

    // Fits the text again whenever the button changes width (e.g. the window
    // is resized), and once Roboto Mono has loaded in place of the wider
    // fallback font. Also runs once straight away.
    const observer = new ResizeObserver(fitToLongestLine)
    observer.observe(button)
    document.fonts?.ready.then(fitToLongestLine)
    return () => observer.disconnect()
  }, [children])

  return (
    <span className="arrow-label">
      <span className="arrow-label__text" ref={textRef}>
        {children}
      </span>
      {/* Hidden from screen readers, so the button is named by its text alone. */}
      <span className="arrow-label__arrow" aria-hidden="true">
        →
      </span>
    </span>
  )
}
