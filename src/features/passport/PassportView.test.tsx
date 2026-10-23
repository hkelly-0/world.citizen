import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveProgress } from '../../shared/progress'
import { PassportView } from './PassportView'

const answered = { repetitions: 1, intervalDays: 1, easeFactor: 2.5, dueDate: '2026-01-02' }

describe('PassportView', () => {
  beforeEach(() => localStorage.clear())

  it('says how countries join when none have been seen', () => {
    render(<PassportView onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 0/195' })).toBeInTheDocument()
    expect(screen.getByText(/No countries yet/)).toBeInTheDocument()
  })

  it("shows each seen country's picture and name", () => {
    saveProgress({ FRA: { globe: answered } })
    render(<PassportView onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 1/195' })).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
    expect(screen.queryByText('Peru')).not.toBeInTheDocument()
  })
})
