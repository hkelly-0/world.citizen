import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import NameCountryGlobe from './NameCountryGlobe'

// The real map needs WebGL, which jsdom doesn't have.
vi.mock('./countryMap', () => ({
  COUNTRY_SHAPES: [],
  createCountryMap: () => ({ once: vi.fn(), setFeatureState: vi.fn(), remove: vi.fn() }),
  flyToCountry: vi.fn(),
  stopHoverHighlight: vi.fn(),
}))

const turkey = countryFacts['TUR']

describe('NameCountryGlobe', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('turns a correct name green, then reports it once the globe has faded', async () => {
    const onAnswer = vi.fn()
    render(<NameCountryGlobe country={turkey} onAnswer={onAnswer} />)

    await userEvent.type(screen.getByLabelText('This is'), 'Turkey')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(screen.getByText('Turkey')).toHaveClass('typed-answer__green')
    expect(onAnswer).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('turns a wrong name red and types out the correct one', async () => {
    const onAnswer = vi.fn()
    render(<NameCountryGlobe country={turkey} onAnswer={onAnswer} />)

    await userEvent.type(screen.getByLabelText('This is'), 'Greece')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(screen.getByText('Greece')).toHaveClass('typed-answer__red')

    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(screen.getByText('Türkiye')).toHaveClass('typed-answer__green')
    expect(onAnswer).toHaveBeenCalledWith(false)
  })
})
