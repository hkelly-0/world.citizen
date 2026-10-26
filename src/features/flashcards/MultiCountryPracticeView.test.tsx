import { render, screen } from '@testing-library/react'
import { State } from 'ts-fsrs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveProgress } from '../../shared/progress'
import { todayString } from './dates'
import { MultiCountryPracticeView } from './MultiCountryPracticeView'

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

describe('MultiCountryPracticeView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('asks for more countries when the Passport can make no question', () => {
    savePassport(['TCD', 'ROU', 'BEL'])
    render(<MultiCountryPracticeView questionIds={['flag-matching']} onBack={vi.fn()} />)

    expect(screen.getByText(/Not enough countries in your Passport yet/)).toBeInTheDocument()
  })

  it('matches Passport countries', () => {
    savePassport(['TCD', 'ROU', 'BEL', 'GIN'])
    render(<MultiCountryPracticeView questionIds={['flag-matching']} onBack={vi.fn()} />)

    for (const name of ['Chad', 'Romania', 'Belgium', 'Guinea']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })
  it('ranks Passport countries', () => {
    savePassport(['USA', 'DEU', 'CAN', 'ISL'])
    render(<MultiCountryPracticeView questionIds={['population-ranking']} onBack={vi.fn()} />)

    expect(screen.getByText('Drag to order these countries by population')).toBeInTheDocument()
  })
})
