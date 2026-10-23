import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordDiscovery } from '../../shared/discoveries'
import { loadPassportSort } from '../../shared/passportSort'
import { saveProgress } from '../../shared/progress'
import { QUESTION_IDS } from '../flashcards/deck'
import { PassportView } from './PassportView'

const answered = { repetitions: 1, intervalDays: 1, easeFactor: 2.5, dueDate: '2026-01-02' }

describe('PassportView', () => {
  beforeEach(() => localStorage.clear())

  it('says how countries join when none have been seen', () => {
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 0/195' })).toBeInTheDocument()
    expect(screen.getByText(/No countries yet/)).toBeInTheDocument()
  })

  it("shows each seen country's picture and name", () => {
    saveProgress({ FRA: { globe: answered } })
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 1/195' })).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
    expect(screen.queryByText('Peru')).not.toBeInTheDocument()
  })

  it('sorts by date discovered when chosen, and remembers the choice', async () => {
    saveProgress({ FRA: { globe: answered }, PER: { globe: answered } })
    recordDiscovery('PER', new Date('2026-10-20T09:00:00Z'))
    recordDiscovery('FRA', new Date('2026-10-21T09:00:00Z'))
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} />)
    const names = () => screen.getAllByRole('listitem').map((item) => item.textContent)

    expect(names()).toEqual(['France', 'Peru'])
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Date discovered')
    expect(names()).toEqual(['Peru', 'France'])
    expect(loadPassportSort()).toBe('date-discovered')
  })
})
