import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { loadCountryShapes } from '../../shared/countries'
import { CountrySearch } from './CountrySearch'
import { searchPlacesFromShapes } from './countryNameSearch'

const SHAPES = loadCountryShapes()
const PLACES = searchPlacesFromShapes(SHAPES)

// The ISO alpha-3 code of the shape onSelect was called with.
function chosenCode(onSelect: ReturnType<typeof vi.fn>): string | null {
  return SHAPES[onSelect.mock.calls[0][0]].isoAlpha3
}

describe('CountrySearch', () => {
  it('shows suggestions once 3 letters are typed', async () => {
    render(<CountrySearch places={PLACES} onSelect={() => {}} />)
    const box = screen.getByRole('combobox', { name: 'Search countries' })

    await userEvent.type(box, 'ko')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await userEvent.type(box, 'r')
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['North Korea', 'South Korea'])
  })

  it('chooses a tapped suggestion, then clears and unfocuses the box', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch places={PLACES} onSelect={onSelect} />)
    const box = screen.getByRole('combobox')

    await userEvent.type(box, 'kor')
    await userEvent.click(screen.getByRole('option', { name: 'South Korea' }))

    expect(chosenCode(onSelect)).toBe('KOR')
    expect(box).toHaveValue('')
    expect(box).not.toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('chooses the top suggestion on Enter', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch places={PLACES} onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'kor{Enter}')

    expect(chosenCode(onSelect)).toBe('PRK')
  })

  it('chooses the suggestion highlighted with the arrow keys on Enter', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch places={PLACES} onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'kor{ArrowDown}{Enter}')

    expect(chosenCode(onSelect)).toBe('KOR')
  })

  it('does nothing on Enter when nothing matches', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch places={PLACES} onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'xyz{Enter}')

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('xyz')
  })
})
