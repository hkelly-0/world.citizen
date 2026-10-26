import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrderingCard } from './OrderingCard'

// Highest population first.
const CODES = ['USA', 'DEU', 'CAN', 'ISL']

describe('OrderingCard', () => {
  // Math.random() always 0 keeps the tiles in the order given, which is right.
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // The test environment has no pointer capture, which pressing a tile uses.
    Element.prototype.setPointerCapture = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function tileNames(): string[] {
    return screen.getAllByRole('listitem').map((item) => item.textContent!)
  }

  it('asks to order the countries between Highest and Lowest', () => {
    render(<OrderingCard stat="population" codes={CODES} onFinish={vi.fn()} />)

    expect(screen.getByText('Drag to order these countries by population')).toBeInTheDocument()
    expect(screen.getByText('Highest')).toBeInTheDocument()
    expect(screen.getByText('Lowest')).toBeInTheDocument()
    expect(tileNames()).toEqual(['United States', 'Germany', 'Canada', 'Iceland'])
  })

  it('swaps two tiles tapped one after the other', async () => {
    render(<OrderingCard stat="population" codes={CODES} onFinish={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'United States' }))
    await userEvent.click(screen.getByRole('button', { name: 'Canada' }))

    expect(tileNames()).toEqual(['Canada', 'Germany', 'United States', 'Iceland'])
  })

  it('on Reveal, puts the tiles in order and marks those the user had in place', async () => {
    const onFinish = vi.fn()
    render(<OrderingCard stat="population" codes={CODES} onFinish={onFinish} />)

    await userEvent.click(screen.getByRole('button', { name: 'United States' }))
    await userEvent.click(screen.getByRole('button', { name: 'Canada' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    // Shown once the tiles have slid into place.
    const next = await screen.findByRole('button', { name: 'Next' }, { timeout: 2000 })

    const tiles = screen.getAllByRole('listitem').map((item) => item.firstElementChild!)
    expect(tiles[0]).toHaveTextContent('United States≥ 100M / Multitudes')
    expect(tiles[0]).toHaveClass('ordering__tile--wrong')
    expect(tiles[1]).toHaveClass('ordering__tile--correct')
    expect(tiles[2]).toHaveClass('ordering__tile--wrong')
    expect(tiles[3]).toHaveClass('ordering__tile--correct')

    await userEvent.click(next)
    expect(onFinish).toHaveBeenCalled()
  })

  it('reveals at once when every tile is already in place', async () => {
    render(<OrderingCard stat="population" codes={CODES} onFinish={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    // No waiting for tiles to slide.
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    for (const item of screen.getAllByRole('listitem')) {
      expect(item.firstElementChild).toHaveClass('ordering__tile--correct')
    }
  })

  it('marks an estimated IHDI', async () => {
    // Dominica's IHDI is estimated.
    render(<OrderingCard stat="ihdi" codes={['USA', 'CHN', 'DMA', 'SOM']} onFinish={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await screen.findByRole('button', { name: 'Next' }, { timeout: 2000 })

    expect(screen.getByText(/\(estimated\)/)).toHaveTextContent('6 / Ok (estimated)')
  })
})
