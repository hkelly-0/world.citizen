import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QUESTION_IDS } from '../flashcards/deck'
import { SettingsMenu } from './SettingsMenu'

describe('SettingsMenu', () => {
  it('lists the 6 kinds of information, ticked if learned', () => {
    render(
      <SettingsMenu learnedQuestionIds={['globe', 'ihdi']} onBack={vi.fn()} onSave={vi.fn()} />,
    )

    expect(screen.getByText('Information I want to learn:')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Location' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Flag' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Area' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Population' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'IHDI' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Capital' })).not.toBeChecked()
  })

  it('passes the ticked question types to onSave, in the usual question order', async () => {
    const onSave = vi.fn()
    render(<SettingsMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onSave={onSave} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Location' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'IHDI' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith(['flag', 'area', 'population', 'capital'])
  })

  it('starts as a disabled "Saved", becomes "Save" when changed, and is "Saved" again if changed back', async () => {
    render(<SettingsMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onSave={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
  })

  it('disables Save when every box is unticked', async () => {
    render(<SettingsMenu learnedQuestionIds={['area']} onBack={vi.fn()} onSave={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
