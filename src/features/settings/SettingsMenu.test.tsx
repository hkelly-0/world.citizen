import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QUESTION_IDS } from '../flashcards/deck'
import { SettingsMenu } from './SettingsMenu'

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
    render(
      <SettingsMenu
        learnedQuestionIds={QUESTION_IDS}
        countryIcon="outline"
        onBack={vi.fn()}
        onSave={onSave}
        onEditPassport={vi.fn()}
        onReplayTutorial={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Location' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'IHDI' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith(
      [
        'flag',
        'area',
        'population',
        'capital',
        'history',
        'people',
        'economy',
        'internationalRelations',
      ],
      'outline',
    )
  })

  it('starts as a disabled "Saved", becomes "Save" when changed, and is "Saved" again if changed back', async () => {
    render(
      <SettingsMenu
        learnedQuestionIds={QUESTION_IDS}
        countryIcon="outline"
        onBack={vi.fn()}
        onSave={vi.fn()}
        onEditPassport={vi.fn()}
        onReplayTutorial={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
  })

  it('disables Save when every box is unticked', async () => {
    render(
      <SettingsMenu
        learnedQuestionIds={['area']}
        countryIcon="outline"
        onBack={vi.fn()}
        onSave={vi.fn()}
        onEditPassport={vi.fn()}
        onReplayTutorial={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('switches the main icon for countries, saved with Save', async () => {
    const onSave = vi.fn()
    render(
      <SettingsMenu
        learnedQuestionIds={QUESTION_IDS}
        countryIcon="outline"
        onBack={vi.fn()}
        onSave={onSave}
        onEditPassport={vi.fn()}
        onReplayTutorial={vi.fn()}
      />,
    )

    expect(screen.getByRole('group', { name: 'Main icon for countries' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Flag' }))
    expect(screen.getByRole('button', { name: 'Flag' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

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
