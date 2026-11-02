import type { ReactNode } from 'react'
import './Popup.css'

// A card over the dimmed screen, with its buttons side by side along the
// bottom, each optionally tinted red or green or ending in an arrow. The first
// button is focused, so Enter presses it. A confirmation ("Ready?", "Exit?",
// "End game?", "Exit tutorial?") centres its title. The score in Name every
// country ("You win", or after Give up) has a larger green title.
export function Popup({
  title,
  isConfirmation = false,
  isScoreTitle = false,
  buttons,
  children,
}: {
  title: string
  isConfirmation?: boolean
  isScoreTitle?: boolean
  buttons: { label: string; onClick: () => void; colour?: 'red' | 'green'; hasArrow?: boolean }[]
  children?: ReactNode
}) {
  return (
    <div className="popup-overlay">
      <div
        className={isConfirmation ? 'popup popup--confirmation' : 'popup'}
        role="dialog"
        aria-label={title}
      >
        <h2 className={isScoreTitle ? 'popup__title popup__title--score' : 'popup__title'}>
          {title}
        </h2>
        {children}
        <div className="popup__buttons">
          {buttons.map((button, index) => (
            <button
              key={button.label}
              className={[
                'popup__button',
                button.colour === undefined ? '' : `popup__button--${button.colour}`,
                button.hasArrow ? 'arrow-button' : '',
              ]
                .filter((name) => name !== '')
                .join(' ')}
              onClick={button.onClick}
              autoFocus={index === 0}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
