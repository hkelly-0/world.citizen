import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

// The globe screen needs WebGL, which the test environment doesn't have, so
// only the menu and flashcards screens are tested here.
describe('App', () => {
  afterEach(() => {
    localStorage.clear()
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
    expect(screen.getByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('saves progress after finishing a card', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))

    // The country is random, so pick the first option each time (button 0 is
    // "← Menu"), then type a capital. Right or wrong, the card gets saved.
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
