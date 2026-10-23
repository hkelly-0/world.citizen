import './BackButton.css'

// Returns to the main menu. Sits in the top-left corner of each screen.
// The Passport's flashcard returns to the Passport instead, so it passes its
// own label.
export function BackButton({
  onClick,
  label = '← Menu',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button className="back-button" onClick={onClick}>
      {label}
    </button>
  )
}
