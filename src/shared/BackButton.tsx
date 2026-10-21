import './BackButton.css'

// Returns to the main menu. Sits in the top-left corner of each screen.
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="back-button" onClick={onClick}>
      ← Menu
    </button>
  )
}
