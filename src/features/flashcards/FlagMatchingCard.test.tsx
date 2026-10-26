import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlagMatchingCard } from './FlagMatchingCard'

const CODES = ['TCD', 'ROU', 'BEL', 'GIN']

describe('FlagMatchingCard', () => {
  // Math.random() always 0 keeps both orders as given: the flags are Chad,
  // Romania, Belgium, Guinea.
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // The test environment has no pointer capture, which pressing a name uses.
    Element.prototype.setPointerCapture = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Taps the name, then the flag, as the user can instead of dragging.
  async function tapOnto(name: string, flagNumber: number) {
    await userEvent.click(screen.getByRole('button', { name }))
    await userEvent.click(screen.getByRole('button', { name: `Flag ${flagNumber}` }))
  }

  it('reveals with names left unplaced, marking their flags wrong', async () => {
    const { container } = render(<FlagMatchingCard codes={CODES} onFinish={vi.fn()} />)

    await tapOnto('Chad', 1)
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    const slots = container.querySelectorAll<HTMLElement>('.flag-matching__slot')
    expect(slots[0]).toHaveClass('flashcard__option--correct')
    expect(slots[1]).toHaveClass('flashcard__option--wrong')
    expect(slots[1]).toHaveTextContent('Romania')
  })

  it('swaps names when one is put on a flag that has a name', async () => {
    const { container } = render(<FlagMatchingCard codes={CODES} onFinish={vi.fn()} />)

    await tapOnto('Chad', 1)
    await tapOnto('Romania', 2)
    // Tapping Chad, then Romania (on flag 2), swaps them.
    await userEvent.click(screen.getByRole('button', { name: 'Chad' }))
    await userEvent.click(screen.getByRole('button', { name: 'Romania' }))

    const slots = container.querySelectorAll<HTMLElement>('.flag-matching__slot')
    expect(within(slots[0]).getByRole('button', { name: 'Romania' })).toBeInTheDocument()
    expect(within(slots[1]).getByRole('button', { name: 'Chad' })).toBeInTheDocument()
  })

  it('marks each flag on Reveal and names the right country under wrong ones', async () => {
    const onFinish = vi.fn()
    const { container } = render(<FlagMatchingCard codes={CODES} onFinish={onFinish} />)

    await tapOnto('Romania', 1)
    await tapOnto('Chad', 2)
    await tapOnto('Belgium', 3)
    await tapOnto('Guinea', 4)
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    const slots = container.querySelectorAll<HTMLElement>('.flag-matching__slot')
    expect(slots[0]).toHaveClass('flashcard__option--wrong')
    expect(slots[0]).toHaveTextContent('RomaniaChad')
    expect(slots[1]).toHaveClass('flashcard__option--wrong')
    expect(slots[2]).toHaveClass('flashcard__option--correct')
    expect(slots[3]).toHaveClass('flashcard__option--correct')
    expect(screen.getByRole('button', { name: 'Flag of Chad' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onFinish).toHaveBeenCalled()
  })
})
