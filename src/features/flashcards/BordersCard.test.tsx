import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BordersCard } from './BordersCard'

function renderBorders(code = 'FRA', onFinish = vi.fn()) {
  render(<BordersCard code={code} countryIcon="outline" onFinish={onFinish} />)
}

async function typeBorder(box: number, typed: string) {
  await userEvent.type(screen.getByLabelText(`Bordering country ${box}`), typed)
}

describe('BordersCard', () => {
  it('marks each box, lists every neighbour, and finishes on Next', async () => {
    const onFinish = vi.fn()
    renderBorders('FRA', onFinish)

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByText('Name up to 4 countries which border France')).toBeInTheDocument()

    // A right one, a wrong one, a repeat, and one left blank.
    await typeBorder(1, 'spain')
    await typeBorder(2, 'Portugal')
    await typeBorder(3, 'Spain')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(screen.getByLabelText('Bordering country 1')).toHaveClass('typed-answer__box--correct')
    // Portugal doesn't border France, and Spain was already named.
    expect(screen.getByLabelText('Bordering country 2')).toHaveClass('flashcard__border-box--wrong')
    expect(screen.getByLabelText('Bordering country 3')).toHaveClass('flashcard__border-box--wrong')
    // France has more neighbours to name, so the blank box was a miss.
    expect(screen.getByLabelText('Bordering country 4')).toHaveClass('flashcard__border-box--wrong')
    const list = screen.getByRole('list', { name: 'Countries bordering France' })
    // Spain, the one named, comes first.
    expect([...list.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Spain',
      'Andorra',
      'Belgium',
      'Brazil',
      'Germany',
      'Italy',
      'Luxembourg',
      'Monaco',
      'Suriname',
      'Switzerland',
    ])
    expect(screen.getByText('Spain', { selector: 'li' })).toHaveClass('flashcard__border--named')
    expect(screen.getByText('Italy', { selector: 'li' })).not.toHaveClass(
      'flashcard__border--named',
    )

    expect(onFinish).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onFinish).toHaveBeenCalled()
  })

  it('moves to the next box on Enter, and reveals on Enter in the last box', async () => {
    renderBorders()

    await userEvent.keyboard('Spain{Enter}')
    expect(screen.getByLabelText('Bordering country 2')).toHaveFocus()
    await userEvent.keyboard('{Enter}{Enter}')
    expect(screen.getByLabelText('Bordering country 4')).toHaveFocus()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    await userEvent.keyboard('Italy{Enter}')
    // The named ones come first, in the order typed.
    const list = screen.getByRole('list', { name: 'Countries bordering France' })
    expect([...list.querySelectorAll('li')].slice(0, 3).map((item) => item.textContent)).toEqual([
      'Spain',
      'Italy',
      'Andorra',
    ])
    expect(screen.getByLabelText('Bordering country 4')).toHaveClass('typed-answer__box--correct')
  })

  it('fills blank boxes with x, red for each missed neighbour and green for the rest', async () => {
    renderBorders('USA')

    // The USA borders Canada and Mexico; only Canada is named. Box 3 holds only
    // spaces, which counts as blank.
    await typeBorder(1, 'Canada')
    await typeBorder(3, '  ')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(screen.getByLabelText('Bordering country 1')).toHaveClass('typed-answer__box--correct')
    expect(screen.getByLabelText('Bordering country 2')).toHaveTextContent('x')
    expect(screen.getByLabelText('Bordering country 2')).toHaveClass('flashcard__border-box--wrong')
    for (const box of [3, 4]) {
      expect(screen.getByLabelText(`Bordering country ${box}`)).toHaveTextContent('x')
      expect(screen.getByLabelText(`Bordering country ${box}`)).toHaveClass(
        'typed-answer__box--correct',
      )
    }
  })

  it('counts a wrong answer as a guess, so no blank box is a miss', async () => {
    renderBorders('USA')

    // Two guesses for the USA's two neighbours, one of them wrong.
    await typeBorder(1, 'ABC')
    await typeBorder(2, 'Mexico')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(screen.getByLabelText('Bordering country 1')).toHaveClass('flashcard__border-box--wrong')
    for (const box of [2, 3, 4]) {
      expect(screen.getByLabelText(`Bordering country ${box}`)).toHaveClass(
        'typed-answer__box--correct',
      )
    }
  })

  it('shows the flag when it is chosen in Settings', () => {
    render(<BordersCard code="FRA" countryIcon="flag" onFinish={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'Flag of France' })).toBeInTheDocument()
  })
})
