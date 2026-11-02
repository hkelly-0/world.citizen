import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

// On phones, choosing waits for the on-screen keyboard to close. Whether the
// device is a phone is read when CountrySearch.tsx loads, so it is loaded
// again with a touch screen's matchMedia.
describe('CountrySearch on a phone', () => {
  async function renderOnPhone(onSelect: () => void) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }))
    vi.resetModules()
    const { CountrySearch: PhoneCountrySearch } = await import('./CountrySearch')
    vi.useFakeTimers()
    const result = render(<PhoneCountrySearch places={PLACES} onSelect={onSelect} />)
    const box = screen.getByRole('combobox')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'kor' } })
    fireEvent.click(screen.getByRole('option', { name: 'South Korea' }))
    return result
  }

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('chooses once the screen stops resizing', async () => {
    const onSelect = vi.fn()
    await renderOnPhone(onSelect)

    act(() => vi.advanceTimersByTime(200))
    window.dispatchEvent(new Event('resize'))
    act(() => vi.advanceTimersByTime(80))
    window.dispatchEvent(new Event('resize'))
    act(() => vi.advanceTimersByTime(80))
    expect(onSelect).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(20))
    expect(chosenCode(onSelect)).toBe('KOR')
  })

  it('chooses anyway if the screen never resizes', async () => {
    const onSelect = vi.fn()
    await renderOnPhone(onSelect)

    act(() => vi.advanceTimersByTime(299))
    expect(onSelect).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(chosenCode(onSelect)).toBe('KOR')
  })

  it('chooses nothing if the screen is left while waiting', async () => {
    const onSelect = vi.fn()
    const { unmount } = await renderOnPhone(onSelect)

    unmount()
    act(() => vi.advanceTimersByTime(1000))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
