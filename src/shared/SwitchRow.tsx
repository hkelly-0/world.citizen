import './SwitchRow.css'

type SwitchRowProps = {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
  // Added to the row's own classes, e.g. to dim the whole row.
  className?: string
}

// A row of an options-page card (src/shared/OptionsPage.css): the label on
// the left and a sliding switch at the right-hand edge. The switch is a real
// checkbox, hidden, so it can be focused and is read out as a checkbox; the
// span after it is what's seen, drawn from the checkbox's state.
export function SwitchRow({ label, checked, disabled, onChange, className }: SwitchRowProps) {
  const rowClassName = 'options-page__row switch-row'
  return (
    <label className={className === undefined ? rowClassName : `${rowClassName} ${className}`}>
      {label}
      <input
        type="checkbox"
        className="switch-row__input"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="switch-row__switch" aria-hidden="true" />
    </label>
  )
}
