import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadProgress, saveProgress } from '../../shared/progress'
import { reviewQuestion } from '../flashcards/fsrs'
import { PassportEditor } from './PassportEditor'

const answered = reviewQuestion(undefined, 'right', '2026-10-01')

describe('PassportEditor', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('lists all 197 countries, ticked if in the Passport', () => {
    saveProgress({ FRA: { globe: answered } })
    render(<PassportEditor learnedQuestionIds={['globe']} onBack={vi.fn()} />)

    expect(screen.getAllByRole('checkbox')).toHaveLength(197)
    expect(screen.getByRole('checkbox', { name: 'France' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Peru' })).not.toBeChecked()
    expect(screen.getByText('1/197')).toBeInTheDocument()
  })

  it('shows only the countries matching the search', async () => {
    render(<PassportEditor learnedQuestionIds={['globe']} onBack={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Search countries' }), 'korea')
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('checkbox', { name: 'North Korea' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'South Korea' })).toBeInTheDocument()

    await userEvent.clear(screen.getByRole('textbox', { name: 'Search countries' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Search countries' }), 'xyz')
    expect(screen.getByText('No countries found')).toBeInTheDocument()
  })

  it('adds countries on Save without asking, then reads "Saved"', async () => {
    render(<PassportEditor learnedQuestionIds={['globe', 'flag']} onBack={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Peru' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(Object.keys(loadProgress().PER)).toEqual(['globe', 'flag'])
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
  })

  it('asks before removing countries, and keeps their progress if cancelled', async () => {
    saveProgress({ FRA: { globe: answered }, PER: { globe: answered } })
    render(<PassportEditor learnedQuestionIds={['globe']} onBack={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'France' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Peru' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Remove 2 countries and delete their progress?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(Object.keys(loadProgress())).toEqual(['FRA', 'PER'])

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(loadProgress()).toEqual({})
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
  })
})
