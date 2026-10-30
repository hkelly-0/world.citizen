import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerResult } from '../flashcards/fsrs'
import { loadDiscoveries } from '../../shared/discoveries'
import { loadProgress } from '../../shared/progress'
import { PassportFlashcardView } from './PassportFlashcardView'

// The real globes need WebGL, which jsdom doesn't have. The stand-in for the
// location globe answers it right; the name globe must never show.
vi.mock('../globe/LocateCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (result: AnswerResult) => void }) => (
    <button onClick={() => onAnswer('right')}>Locate</button>
  ),
}))
vi.mock('../globe/NameCountryGlobe', () => ({
  default: () => <p>Name globe</p>,
}))

describe('PassportFlashcardView', () => {
  beforeEach(() => {
    localStorage.clear()
    // Classic would ask the name question with this; this card never does.
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
  })
  afterEach(() => vi.restoreAllMocks())

  it('asks the chosen questions, ends with Next, saves the review and goes back', async () => {
    const onBack = vi.fn()
    render(
      <PassportFlashcardView
        countryIcon="outline"
        isoAlpha3="FRA"
        learnedQuestionIds={['globe', 'area']}
        onBack={onBack}
      />,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Locate' }))
    expect(screen.queryByText('Name globe')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '≥ 300K km² / Medium' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // France is new, so the Passport count goes up before going back.
    expect(screen.getByText('France ✓')).toBeInTheDocument()
    expect(screen.getByLabelText('1/195')).toBeInTheDocument()
    expect(onBack).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onBack).toHaveBeenCalled()
    expect(Object.keys(loadProgress().FRA).sort()).toEqual(['area', 'globe'])
  })

  it('shows the familiarity of a country already in the Passport before going back', async () => {
    const onBack = vi.fn()
    const { unmount } = render(
      <PassportFlashcardView
        countryIcon="outline"
        isoAlpha3="FRA"
        learnedQuestionIds={['globe']}
        onBack={vi.fn()}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Locate' }))
    unmount()

    render(
      <PassportFlashcardView
        countryIcon="outline"
        isoAlpha3="FRA"
        learnedQuestionIds={['globe']}
        onBack={onBack}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Locate' }))
    expect(screen.queryByText('France ✓')).not.toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Familiarity \d+%$/ })).toBeInTheDocument()
    expect(onBack).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('records when a country is first seen, but not again', async () => {
    const { unmount } = render(
      <PassportFlashcardView
        countryIcon="outline"
        isoAlpha3="FRA"
        learnedQuestionIds={['globe']}
        onBack={vi.fn()}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Locate' }))
    const firstSeen = loadDiscoveries().FRA
    expect(firstSeen).toBeDefined()
    unmount()

    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2099-01-01T00:00:00.000Z')
    render(
      <PassportFlashcardView
        countryIcon="outline"
        isoAlpha3="FRA"
        learnedQuestionIds={['globe']}
        onBack={vi.fn()}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Locate' }))
    expect(loadDiscoveries().FRA).toBe(firstSeen)
  })

  it('returns to the Passport from its back button', async () => {
    const onBack = vi.fn()
    render(
      <PassportFlashcardView
        countryIcon="outline"
        isoAlpha3="FRA"
        learnedQuestionIds={['area']}
        onBack={onBack}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '← Passport' }))
    expect(onBack).toHaveBeenCalled()
  })
})
