import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { State } from 'ts-fsrs'
import { beforeEach, describe, expect, it } from 'vitest'
import { saveProgress } from '../../shared/progress'
import { addDays, todayString } from './dates'
import { FlashcardsView } from './FlashcardsView'

const WARNING =
  "It's recommended to become familiar with the countries you've already seen before learning new ones."

// France's area, answered today and not due again until tomorrow, so the next
// card is always a new country. A low stability is soon forgotten (a recall
// chance in 30 days well under 80%); a high one is remembered.
function saveFranceArea(stability: number) {
  const today = todayString()
  saveProgress({
    FRA: {
      area: {
        stability,
        difficulty: 5,
        reps: 1,
        lapses: 0,
        state: State.Review,
        lastReview: today,
        dueDate: addDays(today, 1),
      },
    },
  })
}

async function answerArea() {
  await userEvent.click(screen.getByRole('button', { name: 'Immense - ≥ 5M km²' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
}

describe('FlashcardsView', () => {
  beforeEach(() => localStorage.clear())

  it('warns before a new country while the seen ones are unfamiliar, once per visit', async () => {
    saveFranceArea(0.2)
    render(<FlashcardsView questionIds={['area']} globeKinds={['locate']} onBack={() => {}} />)

    expect(screen.getByText(WARNING)).toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Discover a new country anyway →' }))

    // The new country's card, then the next new one with no warning.
    await answerArea()
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
    expect(screen.getByText('Area?')).toBeInTheDocument()
  })

  it('does not warn while the seen countries are familiar', () => {
    saveFranceArea(10000)
    render(<FlashcardsView questionIds={['area']} globeKinds={['locate']} onBack={() => {}} />)

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
    expect(screen.getByText('Area?')).toBeInTheDocument()
  })

  it('does not warn when no country has been seen', () => {
    render(<FlashcardsView questionIds={['area']} globeKinds={['locate']} onBack={() => {}} />)

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it('counts only the questions being asked', () => {
    // France's area is unfamiliar, but only capitals are being practised.
    saveFranceArea(0.2)
    render(<FlashcardsView questionIds={['capital']} globeKinds={['locate']} onBack={() => {}} />)

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })
})
