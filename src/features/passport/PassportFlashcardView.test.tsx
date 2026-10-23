import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadDiscoveries } from '../../shared/discoveries'
import { loadProgress } from '../../shared/progress'
import { PassportFlashcardView } from './PassportFlashcardView'

// The real globes need WebGL, which jsdom doesn't have. The stand-in for the
// location globe shows its Next button's text; the name globe must never show.
vi.mock('../globe/LocateCountryGlobe', () => ({
  default: ({
    nextLabel,
    onAnswer,
  }: {
    nextLabel: string
    onAnswer: (isCorrect: boolean) => void
  }) => <button onClick={() => onAnswer(true)}>Locate: {nextLabel}</button>,
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

  it('asks the chosen questions, ends with Done, saves the review and goes back', async () => {
    const onBack = vi.fn()
    render(
      <PassportFlashcardView
        isoAlpha3="FRA"
        learnedQuestionIds={['globe', 'area']}
        onBack={onBack}
      />,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Locate: Next' }))
    expect(screen.queryByText('Name globe')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Medium - ≥ 300K km²' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onBack).toHaveBeenCalled()
    expect(Object.keys(loadProgress().FRA).sort()).toEqual(['area', 'globe'])
  })

  it('records when a country is first seen, but not again', async () => {
    const { unmount } = render(
      <PassportFlashcardView isoAlpha3="FRA" learnedQuestionIds={['globe']} onBack={vi.fn()} />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Locate: Done' }))
    const firstSeen = loadDiscoveries().FRA
    expect(firstSeen).toBeDefined()
    unmount()

    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2099-01-01T00:00:00.000Z')
    render(
      <PassportFlashcardView isoAlpha3="FRA" learnedQuestionIds={['globe']} onBack={vi.fn()} />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Locate: Done' }))
    expect(loadDiscoveries().FRA).toBe(firstSeen)
  })

  it("labels the globe's button Done when it is the only question", async () => {
    render(
      <PassportFlashcardView isoAlpha3="FRA" learnedQuestionIds={['globe']} onBack={vi.fn()} />,
    )

    expect(await screen.findByRole('button', { name: 'Locate: Done' })).toBeInTheDocument()
  })

  it('returns to the Passport from its back button', async () => {
    const onBack = vi.fn()
    render(<PassportFlashcardView isoAlpha3="FRA" learnedQuestionIds={['area']} onBack={onBack} />)

    await userEvent.click(screen.getByRole('button', { name: '← Passport' }))
    expect(onBack).toHaveBeenCalled()
  })
})
