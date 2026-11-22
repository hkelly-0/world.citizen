import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import NameEveryCountry from './NameEveryCountry'
import { NAMING_AREAS } from './namingGame'
import { loadNamingScores } from './namingScores'

// The real map needs WebGL, which jsdom doesn't have. This one loads straight
// away and gives each country one shape, numbered by its ISO code. Its only
// tappable shapes are France, French Guiana (part of France), and Japan:
// tapGlobe(index) taps COUNTRY_SHAPES[index], or the ocean for null.
const setFeatureState = vi.fn()
const jumpTo = vi.fn()
const showBordersOnlyOf = vi.fn()
const flyToCountry = vi.fn()
let clickHandlers: ((event: { point: number | null }) => void)[] = []
vi.mock('../globe/countryMap', () => ({
  COUNTRY_SHAPES: [
    { isoAlpha3: 'FRA', partOf: null },
    { isoAlpha3: null, partOf: 'FRA' },
    { isoAlpha3: 'JPN', partOf: null },
  ],
  createCountryMap: () => ({
    once: (_event: string, onLoad: () => void) => onLoad(),
    on: (_event: string, handler: (event: { point: number | null }) => void) =>
      clickHandlers.push(handler),
    off: (_event: string, handler: (event: { point: number | null }) => void) => {
      clickHandlers = clickHandlers.filter((clickHandler) => clickHandler !== handler)
    },
    setFeatureState,
    jumpTo,
    remove: vi.fn(),
  }),
  findTappedCountryIndex: (_map: unknown, point: number | null) => point,
  flyToCountry: (_map: unknown, countryIndex: string) => flyToCountry(countryIndex),
  hideBorders: vi.fn(),
  shapeIndicesOfCountry: (isoAlpha3: string) => [isoAlpha3],
  showBordersOnlyOf: (_map: unknown, isoAlpha3Codes: string[]) => showBordersOnlyOf(isoAlpha3Codes),
  stopHoverHighlight: vi.fn(),
}))

function tapGlobe(index: number | null) {
  act(() => {
    for (const handler of clickHandlers) handler({ point: index })
  })
}

// The borders shown most recently.
const shownBorders = () => showBordersOnlyOf.mock.lastCall?.[0]

const box = () => screen.getByLabelText('Country name')

const world = NAMING_AREAS[0]
const europe = NAMING_AREAS.find((area) => area.id === 'europe')!

// Opens the game, says No to the stopwatch, and presses Go on "Ready?".
async function startGame(onBack: () => void, area = world) {
  render(<NameEveryCountry area={area} onBack={onBack} />)
  await userEvent.click(screen.getByRole('button', { name: 'No' }))
  await userEvent.click(screen.getByRole('button', { name: 'Go' }))
}

describe('NameEveryCountry', () => {
  // The game's screen has its own history entry, as App gives it.
  beforeEach(() => {
    history.replaceState({ screen: 'name-every-country' }, '')
    localStorage.clear()
    clickHandlers = []
    showBordersOnlyOf.mockClear()
    flyToCountry.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    history.replaceState(null, '')
  })

  it('asks "Show stopwatch?" then "Ready?", with a Menu button, and Go starts the game', async () => {
    const go = vi.spyOn(history, 'go').mockImplementation(() => {})
    render(<NameEveryCountry area={world} onBack={vi.fn()} />)
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
    render(<NameEveryCountry area={world} onBack={vi.fn()} />)
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
    expect(screen.getByRole('dialog', { name: 'Score: 0/197' })).toHaveTextContent('Time: 1:07')
    expect(loadNamingScores('world')).toEqual([
      expect.objectContaining({ namedCount: 0, countryCount: 197, elapsedMs: 67_000 }),
    ])
  })

  it('saves the round when given up, without a time if the stopwatch was off', async () => {
    vi.spyOn(history, 'go').mockImplementation(() => {})
    await startGame(vi.fn(), europe)
    await userEvent.type(box(), 'France{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Give up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(loadNamingScores('europe')).toEqual([
      {
        areaId: 'europe',
        endedAt: expect.any(Number),
        namedCount: 1,
        countryCount: europe.countries.length,
        elapsedMs: null,
        hintCount: 0,
      },
    ])
  })

  it('shows "Tap a country" on Hint, and Hint again cancels it', async () => {
    await startGame(vi.fn(), europe)
    expect(screen.queryByText('Tap a country')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText('Tap a country')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hint' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.queryByText('Tap a country')).not.toBeInTheDocument()
    expect(box()).toHaveFocus()
    tapGlobe(0)
    expect(shownBorders()).toEqual([])
  })

  it("shows a tapped country's border, one per Hint, until it is named", async () => {
    await startGame(vi.fn(), europe)
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    // A far-off part hints its country.
    tapGlobe(1)
    expect(shownBorders()).toEqual(['FRA'])
    expect(screen.queryByText('Tap a country')).not.toBeInTheDocument()
    expect(screen.getByText('First Letter: F')).toBeInTheDocument()
    expect(box()).toHaveFocus()

    // Hint again puts "Tap a country" in its place; cancelling brings it back.
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.queryByText('First Letter: F')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText('First Letter: F')).toBeInTheDocument()

    await userEvent.type(box(), 'France{Enter}')
    expect(shownBorders()).toEqual([])
    expect(screen.queryByText('First Letter: F')).not.toBeInTheDocument()
  })

  it('keeps waiting after a tap on the ocean, outside the area, or on a named country', async () => {
    await startGame(vi.fn(), europe)
    await userEvent.type(box(), 'France{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))

    tapGlobe(null)
    tapGlobe(2)
    tapGlobe(0)
    expect(screen.getByText('Tap a country')).toBeInTheDocument()
    expect(shownBorders()).toEqual([])
  })

  it('zooms to a random unnamed, unhinted country, hinting it, until none is left', async () => {
    // A small made-up area, so every pick can be checked.
    const area = { ...europe, countries: ['FRA', 'DEU'] }
    await startGame(vi.fn(), area)
    await userEvent.type(box(), 'France{Enter}')

    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    await userEvent.click(screen.getByRole('button', { name: 'Or: Zoom to a remaining country' }))
    // The mock's shapes are numbered by ISO code.
    expect(flyToCountry).toHaveBeenCalledWith('DEU')
    expect(shownBorders()).toEqual(['DEU'])
    expect(screen.getByText('First Letter: G')).toBeInTheDocument()
    expect(screen.queryByText('Tap a country')).not.toBeInTheDocument()
    expect(box()).toHaveFocus()

    // Germany is hinted and France named, so there is nothing left to zoom to.
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText('Tap a country')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Or: Zoom to a remaining country' }),
    ).not.toBeInTheDocument()
  })

  it('counts the hints given at the end and in the saved round', async () => {
    await startGame(vi.fn(), europe)
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    tapGlobe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    await userEvent.click(screen.getByRole('button', { name: 'Or: Zoom to a remaining country' }))
    // Cancelled, so not counted.
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }))
    await userEvent.click(screen.getByRole('button', { name: 'Give up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))

    expect(screen.getByRole('dialog', { name: /^Score/ })).toHaveTextContent('Hints: 2')
    expect(loadNamingScores('europe')).toEqual([expect.objectContaining({ hintCount: 2 })])
  })

  it('saves nothing when left before Go', async () => {
    vi.spyOn(history, 'go').mockImplementation(() => {})
    render(<NameEveryCountry area={world} onBack={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))

    expect(loadNamingScores('world')).toEqual([])
  })

  it('leaves straight away on back before Go', async () => {
    const onBack = vi.fn()
    render(<NameEveryCountry area={world} onBack={onBack} />)

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
    expect(screen.getByText('0/197')).toBeInTheDocument()

    await userEvent.type(box(), 'Turkey{Enter}')

    expect(setFeatureState).toHaveBeenLastCalledWith(
      { source: 'countries', id: 'TUR' },
      { selected: false },
    )
    expect(box()).toHaveValue('')
    expect(screen.getByText('1/197')).toBeInTheDocument()
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
    expect(screen.getByText('1/197')).toBeInTheDocument()
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

    const remaining = screen.getByRole('dialog', { name: 'Score: 1/197' })
    expect(screen.getByRole('heading', { name: 'Remaining Countries' })).toBeInTheDocument()
    const names = [...remaining.querySelectorAll('li')].map((item) => item.textContent)
    expect(names).toHaveLength(196)
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
    // A round left midway is saved too.
    expect(loadNamingScores('world')).toEqual([expect.objectContaining({ namedCount: 0 })])
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

  it('turns the globe to a continent, and highlights and counts only its countries', async () => {
    setFeatureState.mockClear()
    await startGame(vi.fn(), europe)

    expect(jumpTo).toHaveBeenLastCalledWith({ center: europe.centre })
    const highlighted = setFeatureState.mock.calls.map(([feature]) => feature.id)
    expect(highlighted.sort()).toEqual([...europe.countries].sort())
    expect(screen.getByText(`0/${europe.countries.length}`)).toBeInTheDocument()
  })

  it('shakes and keeps a country from another continent, without floating anything up', async () => {
    await startGame(vi.fn(), europe)

    await userEvent.type(box(), 'Japan{Enter}')
    expect(box()).toHaveValue('Japan')
    expect(box()).toHaveClass('name-every-country__box--shaking')
    expect(screen.queryByText('Already named')).not.toBeInTheDocument()
    expect(screen.getByText(`0/${europe.countries.length}`)).toBeInTheDocument()
  })

  it("says the user wins once every one of a continent's countries is named", async () => {
    await startGame(vi.fn(), europe)

    for (const isoAlpha3 of europe.countries) {
      fireEvent.change(box(), { target: { value: countryFacts[isoAlpha3].commonName } })
      fireEvent.submit(box())
    }

    const count = europe.countries.length
    expect(screen.getByRole('dialog', { name: `${count}/${count}! You win` })).toBeInTheDocument()
    expect(loadNamingScores('europe')).toEqual([
      expect.objectContaining({ namedCount: count, countryCount: count }),
    ])
  })

  it('says the user wins once every country is named', async () => {
    const go = vi.spyOn(history, 'go').mockImplementation(() => {})
    await startGame(vi.fn())

    for (const facts of Object.values(countryFacts)) {
      fireEvent.change(box(), { target: { value: facts.commonName } })
      fireEvent.submit(box())
    }

    expect(screen.getByRole('dialog', { name: '197/197! You win' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Country name')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(go).toHaveBeenCalledWith(-2)
  })
})
