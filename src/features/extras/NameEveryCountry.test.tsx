import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import NameEveryCountry from './NameEveryCountry'

// The real map needs WebGL, which jsdom doesn't have. This one loads straight
// away and gives each country one shape, numbered by its ISO code.
const setFeatureState = vi.fn()
vi.mock('../globe/countryMap', () => ({
  createCountryMap: () => ({
    once: (_event: string, onLoad: () => void) => onLoad(),
    setFeatureState,
    remove: vi.fn(),
  }),
  hideBorders: vi.fn(),
  shapeIndicesOfCountry: (isoAlpha3: string) => [isoAlpha3],
  stopHoverHighlight: vi.fn(),
}))

const box = () => screen.getByLabelText('Country name')

// Opens the game, says No to the stopwatch and presses Go on "Ready?".
async function startGame(onBack: () => void) {
  render(<NameEveryCountry onBack={onBack} />)
  await userEvent.click(screen.getByRole('button', { name: 'No' }))
  await userEvent.click(screen.getByRole('button', { name: 'Go' }))
}

describe('NameEveryCountry', () => {
  // The game's screen has its own history entry, as App gives it.
  beforeEach(() => history.replaceState({ screen: 'name-every-country' }, ''))

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    history.replaceState(null, '')
  })

  it('asks "Show stopwatch?" then "Ready?", with a Menu button, and Go starts the game', async () => {
    const go = vi.spyOn(history, 'go').mockImplementation(() => {})
    render(<NameEveryCountry onBack={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Show stopwatch?' })).toBeInTheDocument()
    expect(box()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Give up' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(go).toHaveBeenCalledWith(-2)

    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.getByRole('dialog', { name: 'Ready?' })).toBeInTheDocument()
    expect(box()).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(box()).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Give up' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Stopwatch')).not.toBeInTheDocument()
  })

  it('runs the stopwatch from Go, pausing on "End game?", and shows its time at the end', () => {
    vi.useFakeTimers()
    render(<NameEveryCountry onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByLabelText('Stopwatch')).toHaveTextContent('0:00')

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    act(() => vi.advanceTimersByTime(65_000))
    expect(screen.getByLabelText('Stopwatch')).toHaveTextContent('1:05')

    fireEvent.click(screen.getByRole('button', { name: 'Give up' }))
    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.getByLabelText('Stopwatch')).toHaveTextContent('1:05')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    act(() => vi.advanceTimersByTime(2000))

    fireEvent.click(screen.getByRole('button', { name: 'Give up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('dialog', { name: 'Score: 0/195' })).toHaveTextContent('Time: 1:07')
  })

  it('leaves straight away on back before Go', async () => {
    const onBack = vi.fn()
    render(<NameEveryCountry onBack={onBack} />)

    history.back()
    await waitFor(() => expect(onBack).toHaveBeenCalled())
    expect(screen.queryByRole('dialog', { name: 'Exit?' })).not.toBeInTheDocument()
  })

  it('highlights every country, and unhighlights one and clears the box when it is named', async () => {
    await startGame(vi.fn())
    expect(setFeatureState).toHaveBeenCalledWith(
      { source: 'countries', id: 'TUR' },
      { selected: true },
    )
    expect(screen.getByText('0/195')).toBeInTheDocument()

    await userEvent.type(box(), 'Turkey{Enter}')

    expect(setFeatureState).toHaveBeenLastCalledWith(
      { source: 'countries', id: 'TUR' },
      { selected: false },
    )
    expect(box()).toHaveValue('')
    expect(screen.getByText('1/195')).toBeInTheDocument()
  })

  it('floats a right name up as it was typed, until its animation ends', async () => {
    await startGame(vi.fn())

    await userEvent.type(box(), ' türkiye {Enter}')
    const floatingName = screen.getByText('türkiye')
    expect(floatingName).toHaveClass('name-every-country__floating-name')
    fireEvent.animationEnd(floatingName)
    expect(screen.queryByText('türkiye')).not.toBeInTheDocument()
  })

  it('shakes and keeps a wrong name, or one already named', async () => {
    await startGame(vi.fn())

    await userEvent.type(box(), 'Atlantis{Enter}')
    expect(box()).toHaveValue('Atlantis')
    expect(box()).toHaveClass('name-every-country__box--shaking')
    fireEvent.animationEnd(box())
    expect(box()).not.toHaveClass('name-every-country__box--shaking')

    await userEvent.clear(box())
    await userEvent.type(box(), 'Peru{Enter}')
    await userEvent.type(box(), 'peru{Enter}')
    expect(box()).toHaveValue('peru')
    expect(box()).toHaveClass('name-every-country__box--shaking')
    expect(screen.getByText('1/195')).toBeInTheDocument()
  })

  it('floats up "Already named" in red for a country named again, but not for a wrong name', async () => {
    await startGame(vi.fn())

    await userEvent.type(box(), 'Atlantis{Enter}')
    expect(screen.queryByText('Already named')).not.toBeInTheDocument()

    await userEvent.clear(box())
    await userEvent.type(box(), 'Turkey{Enter}')
    await userEvent.type(box(), 'Türkiye{Enter}')
    const alreadyNamed = screen.getByText('Already named')
    expect(alreadyNamed).toHaveClass('name-every-country__floating-name--already-named')
    fireEvent.animationEnd(alreadyNamed)
    expect(screen.queryByText('Already named')).not.toBeInTheDocument()
  })

  it('asks "End game?" on Give up, and Cancel carries on', async () => {
    await startGame(vi.fn())

    await userEvent.click(screen.getByRole('button', { name: 'Give up' }))
    expect(screen.getByRole('dialog', { name: 'End game?' })).toBeInTheDocument()
    expect(box()).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(box()).toBeEnabled()
    expect(box()).toHaveFocus()
  })

  it('lists the remaining countries A–Z on giving up, and Done leaves past the exit guard', async () => {
    const go = vi.spyOn(history, 'go').mockImplementation(() => {})
    await startGame(vi.fn())
    await userEvent.type(box(), 'Afghanistan{Enter}')

    await userEvent.click(screen.getByRole('button', { name: 'Give up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))

    const remaining = screen.getByRole('dialog', { name: 'Score: 1/195' })
    expect(screen.getByRole('heading', { name: 'Remaining Countries' })).toBeInTheDocument()
    const names = [...remaining.querySelectorAll('li')].map((item) => item.textContent)
    expect(names).toHaveLength(194)
    expect(names[0]).toBe('Albania')
    expect(screen.queryByLabelText('Country name')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(go).toHaveBeenCalledWith(-2)
  })

  it('asks "Exit?" on back; Cancel stays and Yes leaves', async () => {
    const onBack = vi.fn()
    await startGame(onBack)
    expect(history.state).toEqual({ screen: 'name-every-country', exitGuard: true })

    history.back()
    expect(await screen.findByRole('dialog', { name: 'Exit?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(box()).toHaveFocus()
    expect(history.state).toEqual({ screen: 'name-every-country', exitGuard: true })
    expect(onBack).not.toHaveBeenCalled()

    history.back()
    await screen.findByRole('dialog', { name: 'Exit?' })
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('leaves straight away on back once the game is over', async () => {
    const onBack = vi.fn()
    await startGame(onBack)
    await userEvent.click(screen.getByRole('button', { name: 'Give up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))

    history.back()
    await waitFor(() => expect(onBack).toHaveBeenCalled())
    expect(screen.queryByRole('dialog', { name: 'Exit?' })).not.toBeInTheDocument()
  })

  it('says the user wins once every country is named', async () => {
    const go = vi.spyOn(history, 'go').mockImplementation(() => {})
    await startGame(vi.fn())

    for (const facts of Object.values(countryFacts)) {
      fireEvent.change(box(), { target: { value: facts.commonName } })
      fireEvent.submit(box())
    }

    expect(screen.getByRole('dialog', { name: '195/195! You win' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Country name')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(go).toHaveBeenCalledWith(-2)
  })
})
