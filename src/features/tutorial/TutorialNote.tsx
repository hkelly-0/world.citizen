import './TutorialNote.css'

type TutorialNoteProps = {
  text: string
  // The tutorial's own button under the text (e.g. Next), if it has one.
  buttonLabel?: string
  // Whether the button gets an arrow: it does when it moves on to another step.
  buttonHasArrow?: boolean
  isButtonDisabled?: boolean
  onButtonClick?: () => void
  // Fixed to the bottom of the screen, over the screen being explained,
  // rather than in the flow of the page.
  isPinned?: boolean
  // Outlined in red instead of blue, for a warning.
  isWarning?: boolean
}

// A tutorial explanation in a highlighted box: above a question on the home
// country's card, on the globe, or over a screen shown during the tour.
export function TutorialNote({
  text,
  buttonLabel,
  buttonHasArrow = true,
  isButtonDisabled = false,
  onButtonClick,
  isPinned = false,
  isWarning = false,
}: TutorialNoteProps) {
  let className = 'tutorial-note'
  if (isPinned) className += ' tutorial-note--pinned'
  if (isWarning) className += ' tutorial-note--warning'

  return (
    <aside className={className} aria-label="Tutorial">
      <p className="tutorial-note__text">{text}</p>
      {buttonLabel !== undefined && (
        <button
          className={
            buttonHasArrow ? 'tutorial-note__button arrow-button' : 'tutorial-note__button'
          }
          onClick={onButtonClick}
          disabled={isButtonDisabled}
        >
          {buttonLabel}
        </button>
      )}
    </aside>
  )
}
