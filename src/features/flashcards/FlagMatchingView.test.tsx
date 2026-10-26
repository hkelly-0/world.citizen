import { render, screen } from '@testing-library/react'
import { State } from 'ts-fsrs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveProgress } from '../../shared/progress'
import { todayString } from './dates'
import { FlagMatchingView } from './FlagMatchingView'

// Puts the countries in the Passport, each with its flag answered today.
function savePassport(codes: string[]) {
  const flag = {
    stability: 10,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    state: State.Review,
    lastReview: todayString(),
  }
  saveProgress(Object.fromEntries(codes.map((code) => [code, { flag }])))
}

describe('FlagMatchingView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('asks for more countries with fewer than 4 in the Passport', () => {
    savePassport(['TCD', 'ROU', 'BEL'])
    render(<FlagMatchingView onBack={vi.fn()} />)

    expect(screen.getByText(/needs at least 4 countries in your Passport/)).toBeInTheDocument()
  })

  it('matches Passport countries', () => {
    savePassport(['TCD', 'ROU', 'BEL', 'GIN'])
    render(<FlagMatchingView onBack={vi.fn()} />)

    for (const name of ['Chad', 'Romania', 'Belgium', 'Guinea']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })
})
