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

  it('matches Passport countries', () => {
    savePassport(['TCD', 'ROU', 'BEL', 'GIN'])
    render(
      <MultiCountryPracticeView
        questionIds={['flag-matching']}
        countryIcon="outline"
        onBack={vi.fn()}
      />,
    )

    for (const name of ['Chad', 'Romania', 'Belgium', 'Guinea']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })
  it('orders Passport countries', () => {
    savePassport(['USA', 'DEU', 'CAN', 'ISL'])
    render(
      <MultiCountryPracticeView
        questionIds={['population-ordering']}
        countryIcon="outline"
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Drag to order these countries by population')).toBeInTheDocument()
  })
  it('matches capitals to Passport countries', () => {
    savePassport(['FRA', 'ESP', 'ITA', 'DEU'])
    render(
      <MultiCountryPracticeView
        questionIds={['capital-matching']}
        countryIcon="outline"
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Match each capital to its country')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Madrid' })).toBeInTheDocument()
  })
  it('asks the borders of a Passport country with land neighbours', () => {
    // Iceland is an island, so only France can be asked.
    savePassport(['ISL', 'FRA'])
    render(
      <MultiCountryPracticeView questionIds={['borders']} countryIcon="outline" onBack={vi.fn()} />,
    )

    expect(screen.getByText('Name up to 4 countries which border France')).toBeInTheDocument()
  })
})
