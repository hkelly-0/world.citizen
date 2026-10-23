import { useState } from 'react'
import type { DeckProgress } from './deck'
import { groupsToChoose } from '../passport/passport'
import './GroupChooser.css'

type GroupChooserProps = {
  progress: DeckProgress
  buttonLabel: string
  // Styles the button like the screen's own (e.g. the flashcards' Go button).
  buttonClassName: string
  // Extra class for the chooser itself, e.g. for spacing on the Passport card.
  className?: string
  onChoose: (groupId: string) => void
}

// A dropdown of the country groups that still have countries not in the
// Passport, A–Z, each with how many are seen (e.g. "Nordic Countries (1/4)"),
// and a button that is enabled once a group is picked. Used before a new
// country in Classic and on the Passport's "New country" card.
export function GroupChooser({
  progress,
  buttonLabel,
  buttonClassName,
  className,
  onChoose,
}: GroupChooserProps) {
  // '' until a group is picked.
  const [groupId, setGroupId] = useState('')

  return (
    <div className={className === undefined ? 'group-chooser' : `group-chooser ${className}`}>
      <select
        className="group-chooser__select"
        aria-label="Group of countries"
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
      >
        <option value="" disabled>
          Choose a group…
        </option>
        {groupsToChoose(progress).map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name} ({choice.seenCount}/{choice.size})
          </option>
        ))}
      </select>
      <button
        type="button"
        className={buttonClassName}
        disabled={groupId === ''}
        onClick={() => onChoose(groupId)}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
