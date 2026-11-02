import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CountryIcon } from '../../shared/settings'
import { QUESTION_IDS, type QuestionId } from '../flashcards/deck'
import { SettingsMenu } from './SettingsMenu'

// Keeps what SettingsMenu saves, as App does, so it shows each change.
function SavingSettingsMenu({
  learnedQuestionIds,
  onSave,
}: {
  learnedQuestionIds: QuestionId[]
  onSave: (questionIds: QuestionId[], countryIcon: CountryIcon) => void
}) {
  const [questionIds, setQuestionIds] = useState(learnedQuestionIds)
  const [icon, setIcon] = useState<CountryIcon>('outline')
  return (
    <SettingsMenu
      learnedQuestionIds={questionIds}
      countryIcon={icon}
      onBack={vi.fn()}
      onSave={(newQuestionIds, newIcon) => {
        setQuestionIds(newQuestionIds)
        setIcon(newIcon)
        onSave(newQuestionIds, newIcon)
      }}
      onEditPassport={vi.fn()}
      onReplayTutorial={vi.fn()}
    />
  )
}

describe('SettingsMenu', () => {
  it('lists the 6 kinds of information, ticked if learned', () => {
    render(
      <SettingsMenu
        learnedQuestionIds={['globe', 'ihdi']}
        countryIcon="outline"
        onBack={vi.fn()}
        onSave={vi.fn()}
        onEditPassport={vi.fn()}
        onReplayTutorial={vi.fn()}
      />,
    )

    expect(screen.getByText('Information I want to learn')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Location' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Flag' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Area' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Population' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'IHDI' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Capital' })).not.toBeChecked()
  })

  it('saves the ticked question types on every change, in the usual question order', async () => {
    const onSave = vi.fn()
    render(<SavingSettingsMenu learnedQuestionIds={['capital']} onSave={onSave} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'IHDI' }))
    expect(onSave).toHaveBeenLastCalledWith(['ihdi', 'capital'], 'outline')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Location' }))
    expect(onSave).toHaveBeenLastCalledWith(['globe', 'ihdi', 'capital'], 'outline')
    await userEvent.click(screen.getByRole('checkbox', { name: 'IHDI' }))
    expect(onSave).toHaveBeenLastCalledWith(['globe', 'capital'], 'outline')
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument()
  })

  it('disables the last ticked box, so one is always ticked', async () => {
    render(<SavingSettingsMenu learnedQuestionIds={['area', 'capital']} onSave={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Flag' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeEnabled()
  })

  it('saves the main icon for countries as soon as it is switched', async () => {
    const onSave = vi.fn()
    render(<SavingSettingsMenu learnedQuestionIds={QUESTION_IDS} onSave={onSave} />)

    expect(screen.getByRole('group', { name: 'Main icon for countries' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Flag' }))
    expect(screen.getByRole('button', { name: 'Flag' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveAttribute('aria-pressed', 'false')
    expect(onSave).toHaveBeenCalledWith(QUESTION_IDS, 'flag')
  })

  it('asks "Are you sure?" before opening the Passport editor, and can be cancelled', async () => {
    const onEditPassport = vi.fn()
    render(
      <SettingsMenu
        learnedQuestionIds={QUESTION_IDS}
        countryIcon="outline"
        onBack={vi.fn()}
        onSave={vi.fn()}
        onEditPassport={onEditPassport}
        onReplayTutorial={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Manually edit Passport' }))
    expect(screen.getByText(/Are you sure\?/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(/Are you sure\?/)).not.toBeInTheDocument()
    expect(onEditPassport).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Manually edit Passport' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onEditPassport).toHaveBeenCalled()
  })
})
