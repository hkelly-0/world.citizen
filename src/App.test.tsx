import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { State } from 'ts-fsrs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { todayString } from './features/flashcards/dates'
import type { AnswerResult } from './features/flashcards/fsrs'
import { saveLearningGroup } from './shared/learningGroup'
import { saveProgress } from './shared/progress'

// The flashcards' globe questions need WebGL too. These stand-ins answer
// correctly when their button is clicked.
vi.mock('./features/globe/LocateCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (result: AnswerResult) => void }) => (
    <button onClick={() => onAnswer('right')}>Answer globe question</button>
  ),
}))
vi.mock('./features/globe/NameCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (isCorrect: boolean) => void }) => (
    <button onClick={() => onAnswer(true)}>Answer globe question</button>
  ),
}))

// The globe screen needs WebGL, which the test environment doesn't have, so
// only the menu and flashcards screens are tested here.
describe('App', () => {
  // A group of countries is being learned, so Classic goes straight to a new
  // country instead of first asking for a group.
  beforeEach(() => saveLearningGroup('nordic'))

  afterEach(() => {
    localStorage.clear()
    // Screens add history entries, so start each test back on the menu's.
    history.replaceState(null, '')
  })

  it('opens on a main menu with the title, subtitle, Globe, Flashcards and Settings', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(screen.getByText('learn every country')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Globe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('opens classic flashcards from the flashcards menu, and goes back to the main menu', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByRole('button', { name: 'Custom Practice' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Flag?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it("goes from classic flashcards to the main menu with the browser's back button", async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Flag?')).toBeInTheDocument()

    history.back()
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it("goes back to the menu with the browser's back button", async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByRole('button', { name: 'Classic Mode' })).toBeInTheDocument()

    history.back()
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('opens custom practice from the flashcards menu, and goes back to the main menu', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Custom Practice' }))
    expect(screen.getByText('Select which question types to see today')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('saves progress after finishing a card', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    // The country and globe question are random, but every card starts with
    // a globe question.
    await userEvent.click(await screen.findByRole('button', { name: 'Answer globe question' }))

    // Pick the first option each time (button 0 is "← Menu") for the flag and
    // the three range questions, then type a capital. Right or wrong, the card
    // gets saved.
    for (let i = 0; i < 4; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: /./ })[1])
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    }
    await userEvent.type(screen.getByRole('textbox'), 'Nowhere')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    // Then the four info questions, each revealed (once the country's info
    // file has loaded) and rated, worded for a first viewing.
    for (let i = 0; i < 4; i++) {
      const reveal = screen.getByRole('button', { name: 'Reveal' })
      await vi.waitFor(() => expect(reveal).toBeEnabled())
      await userEvent.click(reveal)
      await userEvent.click(screen.getByRole('button', { name: 'Already known' }))
    }

    const saved = JSON.parse(localStorage.getItem('geography-app/fsrs-progress') ?? '{}')
    expect(Object.keys(saved)).toHaveLength(1)
    // Each of the country's 10 questions has its own progress.
    const [countryProgress] = Object.values(saved) as object[]
    expect(Object.keys(countryProgress).sort()).toEqual([
      'area',
      'capital',
      'economy',
      'flag',
      'globe',
      'history',
      'ihdi',
      'internationalRelations',
      'people',
      'population',
    ])
  })

  it('practises only the ticked question types, and saves progress for just those', async () => {
    // Custom Practice only shows countries in the Passport, so put France in
    // it: its area answered today.
    const today = todayString()
    const franceArea = {
      stability: 10,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      state: State.Review,
      lastReview: today,
    }
    saveProgress({ FRA: { area: franceArea } })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Custom Practice' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    // Straight to the capital: no globe or range questions.
    expect(screen.queryByRole('button', { name: 'Answer globe question' })).not.toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox'), 'Nowhere')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // France's capital is now saved; its area is untouched.
    const saved = JSON.parse(localStorage.getItem('geography-app/fsrs-progress') ?? '{}')
    expect(Object.keys(saved)).toEqual(['FRA'])
    expect(Object.keys(saved.FRA)).toEqual(['area', 'capital'])
    expect(saved.FRA.area).toEqual(franceArea)

    // Back goes straight to the main menu.
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('saves settings, then asks only the learned questions in Classic and offers only them in Custom Practice', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const unticked = ['Location', 'Flag', 'Area', 'Population', 'IHDI']
    unticked.push('History', 'People', 'Economy', 'Int. Relations')
    for (const label of unticked) {
      await userEvent.click(screen.getByRole('checkbox', { name: label }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    // Save stays on the settings screen, now showing "Saved", and keeps them.
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    expect(JSON.parse(localStorage.getItem('geography-app/learned-question-ids')!)).toEqual([
      'capital',
    ])
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Custom Practice' }))
    // Borders isn't in Settings, so it is always offered; Capital Matching is
    // offered as Capital is learned.
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'Capital' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Matching - Capitals' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    // Straight to the capital: no globe, flag or range questions.
    expect(screen.queryByRole('button', { name: 'Answer globe question' })).not.toBeInTheDocument()
    expect(screen.queryByText('Flag?')).not.toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeInTheDocument()
  })

  it('leaves settings unchanged when going back without saving', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeChecked()
    expect(localStorage.getItem('geography-app/learned-question-ids')).toBeNull()
  })
})
