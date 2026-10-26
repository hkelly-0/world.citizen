import { useEffect, useRef } from 'react'
import './ConfirmMessage.css'

type ConfirmMessageProps = {
  message: string
  // The label of the button that goes ahead, shown in red.
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// A message asking the user to confirm, with Cancel and a red button to go
// ahead. Shown in place of the button that asked for it, and scrolled into
// view, as on a phone that button can be near the bottom of the screen.
export function ConfirmMessage({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmMessageProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // `?.` because the test environment has no scrolling.
    boxRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [])

  return (
    <div ref={boxRef} className="confirm-message" role="alertdialog" aria-label={message}>
      <p className="confirm-message__text">{message}</p>
      <div className="confirm-message__buttons">
        <button className="confirm-message__button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="confirm-message__button confirm-message__button--confirm"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
