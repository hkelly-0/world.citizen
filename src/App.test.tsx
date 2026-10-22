import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// The flashcards' globe question needs WebGL too. This stand-in answers
// correctly when its button is clicked.
vi.mock('./features/globe/LocateCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (isCorrect: boolean) => void }) => (
    <button onClick={() => onAnswer(true)}>Tap right country</button>
  ),
}))

// The globe screen needs WebGL, which the test environment doesn't have, so
// only the menu and flashcards screens are tested here.
describe('App', () => {
  afterEach(() => {
    localStorage.clear()
    // Screens add history entries, so start each test back on the menu's.
    history.replaceState(null, '')
  })

  it('opens on a main menu with the title, subtitle, Globe and Flashcards', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(screen.getByText('learn every country')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Globe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('opens the flashcards and goes back to the menu', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByText('Area?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it("goes back to the menu with the browser's back button", async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByText('Area?')).toBeInTheDocument()

    history.back()
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('saves progress after finishing a card', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))

    // The country is random. Tuvalu has no location question, so wait for
    // either the globe or the area question, and tap the globe if it's there.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Tap right country' }) ?? screen.queryByText('Area?'),
      ).not.toBeNull(),
    )
    const globeButton = screen.queryByRole('button', { name: 'Tap right country' })
    if (globeButton !== null) await userEvent.click(globeButton)

    // Pick the first option each time (button 0 is "← Menu"), then type a
    // capital. Right or wrong, the card gets saved.
    for (let i = 0; i < 3; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: /./ })[1])
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    }
    await userEvent.type(screen.getByRole('textbox'), 'Nowhere')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    const saved = JSON.parse(localStorage.getItem('geography-app/flashcard-progress') ?? '{}')
    expect(Object.keys(saved)).toHaveLength(1)
  })
})
