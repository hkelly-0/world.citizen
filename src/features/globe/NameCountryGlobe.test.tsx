import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import NameCountryGlobe from './NameCountryGlobe'

// The real map needs WebGL, which jsdom doesn't have.
vi.mock('./countryMap', () => ({
  createCountryMap: () => ({ once: vi.fn(), setFeatureState: vi.fn(), remove: vi.fn() }),
  flyToCountry: vi.fn(),
  shapeIndicesOfCountry: () => [0],
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

  it('turns a correct name green, then reports it once Next is pressed and the globe has faded', async () => {
    const onAnswer = vi.fn()
    render(<NameCountryGlobe country={turkey} fadesOut onAnswer={onAnswer} />)

    await userEvent.type(screen.getByLabelText('This is'), 'Turkey')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(screen.getByLabelText('Turkey')).toHaveClass('typed-answer__green')

    // Nothing happens by itself; the answer waits for Next.
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(onAnswer).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onAnswer).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('turns a wrong name red, types out the correct one, then enables Next', async () => {
    const onAnswer = vi.fn()
    render(<NameCountryGlobe country={turkey} fadesOut onAnswer={onAnswer} />)

    await userEvent.type(screen.getByLabelText('This is'), 'Greece')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(screen.getByText('Greece')).toHaveClass('typed-answer__red')
    // Next is shown but disabled until the correct name has finished typing out.
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(screen.getByText('Türkiye')).toHaveClass('typed-answer__green')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(onAnswer).toHaveBeenCalledWith(false)
  })

  it('reports the answer as soon as Next is pressed when the globe does not fade out', async () => {
    const onAnswer = vi.fn()
    const { container } = render(
      <NameCountryGlobe country={turkey} fadesOut={false} onAnswer={onAnswer} />,
    )

    await userEvent.type(screen.getByLabelText('This is'), 'Turkey')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onAnswer).toHaveBeenCalledWith(true)
    expect(container.querySelector('.name-globe--fading')).toBeNull()
  })
})
