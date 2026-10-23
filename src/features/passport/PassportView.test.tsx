import { render, screen } from '@testing-library/react'
import { State } from 'ts-fsrs'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { recordDiscovery } from '../../shared/discoveries'
import { loadPassportSort } from '../../shared/passportSort'
import { loadProgress, saveProgress } from '../../shared/progress'
import { addDays, todayString } from '../flashcards/dates'
import { QUESTION_IDS } from '../flashcards/deck'
import { NEW_COUNTRY_WARNING, randomUnseenCountry } from './passport'
import { PassportView } from './PassportView'

const answered = { stability: 10, difficulty: 5, reps: 1, lapses: 0, state: State.Review, lastReview: '2026-01-01', dueDate: '2026-01-11' }

// Answered today with a high stability, so well remembered in 30 days (no
// warning before a new country), or a low one, so soon forgotten (a warning).
function answeredToday(stability: number) {
  const today = todayString()
  return { ...answered, stability, lastReview: today, dueDate: addDays(today, 1) }
}

describe('PassportView', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('says how countries join when none have been seen', () => {
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 0/195' })).toBeInTheDocument()
    expect(screen.getByText(/No countries yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New country' })).toBeInTheDocument()
  })

  it('puts the New country card last whatever the sort', async () => {
    saveProgress({ FRA: { globe: answered }, PER: { globe: answered } })
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)
    const names = () => screen.getAllByRole('listitem').map((item) => item.textContent)

    expect(names()).toEqual(['France', 'Peru', 'New country'])
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Familiarity')
    expect(names().at(-1)).toBe('New country')
  })

  it("plays an unseen country's flashcard from the enlarged New country card", async () => {
    saveProgress({ FRA: { globe: answeredToday(10000) } })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onPlayFlashcard = vi.fn()
    render(
      <PassportView
        learnedQuestionIds={QUESTION_IDS}
        onBack={vi.fn()}
        onPlayFlashcard={onPlayFlashcard}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New country' }))
    expect(screen.getByRole('complementary', { name: 'New country details' })).toBeInTheDocument()
    expect(screen.getByText("Discover a country you haven't seen yet.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Play flashcard →' }))
    expect(onPlayFlashcard).toHaveBeenCalledWith(randomUnseenCountry(loadProgress(), () => 0))
    expect(onPlayFlashcard).not.toHaveBeenCalledWith('FRA')
  })

  it('warns on the New country card while the seen countries are unfamiliar', async () => {
    saveProgress({ FRA: { globe: answeredToday(0.2) } })
    const onPlayFlashcard = vi.fn()
    render(
      <PassportView
        learnedQuestionIds={QUESTION_IDS}
        onBack={vi.fn()}
        onPlayFlashcard={onPlayFlashcard}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New country' }))
    expect(screen.getByText(NEW_COUNTRY_WARNING)).toBeInTheDocument()
    expect(screen.queryByText("Discover a country you haven't seen yet.")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go anyways' }))
    expect(onPlayFlashcard).toHaveBeenCalledTimes(1)
    expect(onPlayFlashcard).not.toHaveBeenCalledWith('FRA')
  })

  it('closes the enlarged New country card', async () => {
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'New country' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('hides the New country card once every country is collected', () => {
    saveProgress(
      Object.fromEntries(Object.keys(countryFacts).map((code) => [code, { globe: answered }])),
    )
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 195/195' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New country' })).not.toBeInTheDocument()
  })

  it("shows each seen country's picture and name", () => {
    saveProgress({ FRA: { globe: answered } })
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Passport 1/195' })).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
    expect(screen.queryByText('Peru')).not.toBeInTheDocument()
  })

  it('enlarges a country with its names but no facts when clicked, and closes it', async () => {
    saveProgress({ FRA: { globe: answered } })
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /France/ }))
    expect(screen.getByRole('complementary', { name: 'France details' })).toBeInTheDocument()
    expect(screen.getByText('French Republic')).toBeInTheDocument()
    expect(screen.queryByText('Paris')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it("plays the open country's flashcard", async () => {
    saveProgress({ FRA: { globe: answered } })
    const onPlayFlashcard = vi.fn()
    render(
      <PassportView
        learnedQuestionIds={QUESTION_IDS}
        onBack={vi.fn()}
        onPlayFlashcard={onPlayFlashcard}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /France/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Play flashcard →' }))
    expect(onPlayFlashcard).toHaveBeenCalledWith('FRA')
  })

  it('sorts by date discovered when chosen, and remembers the choice', async () => {
    saveProgress({ FRA: { globe: answered }, PER: { globe: answered } })
    recordDiscovery('PER', new Date('2026-10-20T09:00:00Z'))
    recordDiscovery('FRA', new Date('2026-10-21T09:00:00Z'))
    render(<PassportView learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onPlayFlashcard={vi.fn()} />)
    const names = () => screen.getAllByRole('listitem').map((item) => item.textContent)

    expect(names()).toEqual(['France', 'Peru', 'New country'])
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Date discovered')
    expect(names()).toEqual(['Peru', 'France', 'New country'])
    expect(loadPassportSort()).toBe('date-discovered')
  })
})
