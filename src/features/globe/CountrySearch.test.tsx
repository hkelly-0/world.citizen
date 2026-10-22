import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CountrySearch } from './CountrySearch'

describe('CountrySearch', () => {
  it('shows suggestions once 3 letters are typed', async () => {
    render(<CountrySearch onSelect={() => {}} />)
    const box = screen.getByRole('combobox', { name: 'Search countries' })

    await userEvent.type(box, 'ko')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await userEvent.type(box, 'r')
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['North Korea', 'South Korea'])
  })

  it('chooses a tapped suggestion, then clears and unfocuses the box', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch onSelect={onSelect} />)
    const box = screen.getByRole('combobox')

    await userEvent.type(box, 'kor')
    await userEvent.click(screen.getByRole('option', { name: 'South Korea' }))

    expect(onSelect).toHaveBeenCalledWith('KOR')
    expect(box).toHaveValue('')
    expect(box).not.toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('chooses the top suggestion on Enter', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'kor{Enter}')

    expect(onSelect).toHaveBeenCalledWith('PRK')
  })

  it('chooses the suggestion highlighted with the arrow keys on Enter', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'kor{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledWith('KOR')
  })

  it('does nothing on Enter when nothing matches', async () => {
    const onSelect = vi.fn()
    render(<CountrySearch onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'xyz{Enter}')

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('xyz')
  })
})
