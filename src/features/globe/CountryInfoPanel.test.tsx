import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CountryShape } from '../../shared/countries'
import { QUESTION_IDS } from '../flashcards/deck'
import { CountryInfoPanel } from './CountryInfoPanel'

const france: CountryShape = {
  name: 'France',
  isoNumeric: '250',
  isoAlpha3: 'FRA',
  partOf: null,
  geometry: { type: 'Polygon', coordinates: [] },
}

// Props most tests don't care about: every fact is learned, and the callbacks do nothing.
const panelProps = {
  learnedQuestionIds: QUESTION_IDS,
  onClose: () => {},
  onSelectCountry: () => {},
}

// The value shown beside a label such as "Area". A range title is split into
// parts, so it can't be found by its text alone.
function valueOf(label: string): HTMLElement {
  return screen.getByText(label).nextElementSibling as HTMLElement
}

describe('CountryInfoPanel', () => {
  it("shows the country's names and facts", () => {
    render(<CountryInfoPanel {...panelProps} country={france} />)

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByText('French Republic')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of France' })).toHaveAttribute(
      'src',
      '/flags/FRA.svg',
    )
    expect(screen.getByText('Capital')).toBeInTheDocument()
    expect(screen.getByText('Paris')).toBeInTheDocument()
    // Population, area, and IHDI show the rounded value with the range's name.
    expect(valueOf('Population')).toHaveTextContent('67M Numerous')
    expect(valueOf('Area')).toHaveTextContent('550K km² Medium')
    // The "?" after the value opens the IHDI breakdown.
    expect(valueOf('IHDI')).toHaveTextContent('8.4? Great')
  })

  it("opens and closes the IHDI's breakdown from the ? beside its value", async () => {
    render(<CountryInfoPanel {...panelProps} country={france} />)
    const button = screen.getByRole('button', { name: 'IHDI breakdown' })
    expect(screen.queryByText('Lifespan')).not.toBeInTheDocument()

    await userEvent.click(button)
    // France's inequality-adjusted parts, on the IHDI's 0-10 scale.
    expect(screen.getByText('Lifespan').nextElementSibling).toHaveTextContent('9.4')
    expect(screen.getByText('Education').nextElementSibling).toHaveTextContent('8.0')
    expect(screen.getByText('Income').nextElementSibling).toHaveTextContent('7.8')

    // Tapping elsewhere in the panel closes it, as does the ? again.
    await userEvent.click(screen.getByRole('heading', { name: 'France' }))
    expect(screen.queryByText('Lifespan')).not.toBeInTheDocument()
    await userEvent.click(button)
    await userEvent.click(button)
    expect(screen.queryByText('Lifespan')).not.toBeInTheDocument()
  })

  it("opens a bubble with the country's status from the * after a non-UN member's name", async () => {
    const taiwan: CountryShape = { ...france, name: 'Taiwan', isoAlpha3: 'TWN' }
    render(<CountryInfoPanel {...panelProps} country={taiwan} />)
    const button = screen.getByRole('button', { name: 'Status' })
    expect(screen.queryByText('Partially recognized state')).not.toBeInTheDocument()

    await userEvent.click(button)
    expect(screen.getByText('Partially recognized state')).toBeInTheDocument()

    // Tapping elsewhere in the panel closes it.
    await userEvent.click(screen.getByText('Capital'))
    expect(screen.queryByText('Partially recognized state')).not.toBeInTheDocument()
  })

  it("shows no * after a UN member's name", () => {
    render(<CountryInfoPanel {...panelProps} country={france} />)
    expect(screen.queryByRole('button', { name: 'Status' })).not.toBeInTheDocument()
  })

  it('keeps the IHDI breakdown open on taps outside the panel and on selecting another country', async () => {
    const { rerender } = render(<CountryInfoPanel {...panelProps} country={france} />)
    await userEvent.click(screen.getByRole('button', { name: 'IHDI breakdown' }))

    // E.g. a tap on the globe.
    await userEvent.click(document.body)
    expect(screen.getByText('Lifespan')).toBeInTheDocument()

    const saudiArabia: CountryShape = { ...france, name: 'Saudi Arabia', isoAlpha3: 'SAU' }
    rerender(<CountryInfoPanel {...panelProps} country={saudiArabia} />)
    expect(screen.getByText('Insufficient data for breakdown')).toBeInTheDocument()
  })

  it('lists every capital for countries with several', () => {
    const southAfrica: CountryShape = { ...france, name: 'South Africa', isoAlpha3: 'ZAF' }
    render(<CountryInfoPanel {...panelProps} country={southAfrica} />)

    expect(screen.getByText('Capitals')).toBeInTheDocument()
    expect(screen.getByText('Pretoria, Bloemfontein, Cape Town')).toBeInTheDocument()
  })

  it('shows "No data" when a country has no IHDI', () => {
    const vatican: CountryShape = { ...france, name: 'Vatican', isoAlpha3: 'VAT' }
    render(<CountryInfoPanel {...panelProps} country={vatican} />)

    expect(screen.getByRole('heading', { name: 'Vatican City' })).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'IHDI breakdown' })).not.toBeInTheDocument()
  })

  it('marks an estimated IHDI value with (est.)', () => {
    const saudiArabia: CountryShape = { ...france, name: 'Saudi Arabia', isoAlpha3: 'SAU' }
    render(<CountryInfoPanel {...panelProps} country={saudiArabia} />)

    expect(valueOf('IHDI')).toHaveTextContent('8.0 (est.)? Great')
  })

  it('says an estimated IHDI has no breakdown', async () => {
    const saudiArabia: CountryShape = { ...france, name: 'Saudi Arabia', isoAlpha3: 'SAU' }
    render(<CountryInfoPanel {...panelProps} country={saudiArabia} />)

    await userEvent.click(screen.getByRole('button', { name: 'IHDI breakdown' }))

    expect(screen.getByText('Insufficient data for breakdown')).toBeInTheDocument()
  })

  it('shows the value in place of the bound in the highest population range', () => {
    const india: CountryShape = { ...france, name: 'India', isoAlpha3: 'IND' }
    render(<CountryInfoPanel {...panelProps} country={india} />)

    expect(valueOf('Population')).toHaveTextContent(/^1\.\dB Billions$/)
  })

  it('says what a territory is, by ISO code or, with no code, by map name', () => {
    const greenland: CountryShape = { ...france, name: 'Greenland', isoAlpha3: 'GRL' }
    const { unmount } = render(<CountryInfoPanel {...panelProps} country={greenland} />)
    expect(screen.getByRole('heading', { name: 'Greenland' })).toBeInTheDocument()
    expect(screen.getByText(/^Autonomous territory of/)).toHaveTextContent(
      'Autonomous territory of Denmark',
    )
    unmount()

    const somaliland: CountryShape = {
      ...france,
      name: 'Somaliland',
      isoNumeric: null,
      isoAlpha3: null,
    }
    render(<CountryInfoPanel {...panelProps} country={somaliland} />)
    expect(screen.getByText(/^Self-declared state/)).toHaveTextContent(
      'Self-declared state. Claimed by Somalia',
    )
  })

  it("shows a territory's area and population against the countries' ranges", () => {
    const greenland: CountryShape = { ...france, name: 'Greenland', isoAlpha3: 'GRL' }
    render(<CountryInfoPanel {...panelProps} country={greenland} />)

    expect(valueOf('Area')).toHaveTextContent('2.2M km² Large')
    expect(valueOf('Population')).toHaveTextContent('56K Minute')
  })

  it('shows "No permanent population" for areas where nobody lives', () => {
    const antarctica: CountryShape = { ...france, name: 'Antarctica', isoAlpha3: 'ATA' }
    render(<CountryInfoPanel {...panelProps} country={antarctica} />)

    expect(valueOf('Population')).toHaveTextContent('No permanent population')
  })

  it("selects a country when its name in a territory's subtitle is clicked", async () => {
    const onSelectCountry = vi.fn()
    const guam: CountryShape = { ...france, name: 'Guam', isoAlpha3: 'GUM' }
    render(<CountryInfoPanel {...panelProps} country={guam} onSelectCountry={onSelectCountry} />)

    await userEvent.click(screen.getByRole('button', { name: 'United States' }))

    expect(onSelectCountry).toHaveBeenCalledWith('USA')
  })

  it('shows a note for map areas with no subtitle', () => {
    const unknown: CountryShape = { ...france, name: 'Nowhere', isoNumeric: null, isoAlpha3: null }
    render(<CountryInfoPanel {...panelProps} country={unknown} />)

    expect(screen.getByText('Not one of the 197 countries in this app.')).toBeInTheDocument()
  })

  it('hides facts not learned in Settings, but keeps the names', () => {
    render(
      <CountryInfoPanel {...panelProps} country={france} learnedQuestionIds={['globe', 'area']} />,
    )

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByText('French Republic')).toBeInTheDocument()
    expect(valueOf('Area')).toHaveTextContent('550K km² Medium')
    expect(screen.queryByText('Paris')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Flag of France' })).not.toBeInTheDocument()
    expect(screen.queryByText('Population')).not.toBeInTheDocument()
    expect(screen.queryByText('IHDI')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is pressed', async () => {
    const onClose = vi.fn()
    render(<CountryInfoPanel {...panelProps} country={france} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  describe('paragraphs about the country', () => {
    const canada: CountryShape = { ...france, name: 'Canada', isoAlpha3: 'CAN' }
    const heading = (name: string) => screen.getByRole('button', { name })
    // The paragraph a heading opens and closes.
    const paragraph = (name: string) =>
      document.getElementById(heading(name).getAttribute('aria-controls')!)

    it('are only shown when asked for', () => {
      render(<CountryInfoPanel {...panelProps} country={canada} />)

      expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument()
    })

    it('hide paragraphs not learned in Settings', () => {
      render(
        <CountryInfoPanel
          {...panelProps}
          learnedQuestionIds={['capital', 'history', 'economy']}
          country={canada}
          showCountryInfo
        />,
      )

      expect(heading('History')).toBeInTheDocument()
      expect(heading('Economy')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'People' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Int. Relations' })).not.toBeInTheDocument()
    })

    it('start with every paragraph closed, showing just the headings', () => {
      render(<CountryInfoPanel {...panelProps} country={canada} showCountryInfo />)

      for (const name of ['History', 'People', 'Economy', 'Int. Relations']) {
        expect(heading(name)).toHaveAttribute('aria-expanded', 'false')
        expect(paragraph(name)).not.toBeVisible()
      }
    })

    it('open one paragraph at a time, and close it when its heading is pressed again', async () => {
      render(<CountryInfoPanel {...panelProps} country={canada} showCountryInfo />)

      await userEvent.click(heading('History'))
      expect(await screen.findByText(/Indigenous nations/)).toBeVisible()

      await userEvent.click(heading('Economy'))
      expect(heading('History')).toHaveAttribute('aria-expanded', 'false')
      expect(paragraph('History')).not.toBeVisible()
      expect(heading('Economy')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText(/advanced economy/)).toBeVisible()

      await userEvent.click(heading('Economy'))
      expect(heading('Economy')).toHaveAttribute('aria-expanded', 'false')
      expect(paragraph('Economy')).not.toBeVisible()
    })

    it('close again when another country is selected', async () => {
      const { rerender } = render(
        <CountryInfoPanel {...panelProps} country={canada} showCountryInfo />,
      )
      await userEvent.click(heading('History'))

      rerender(<CountryInfoPanel {...panelProps} country={france} showCountryInfo />)
      rerender(<CountryInfoPanel {...panelProps} country={canada} showCountryInfo />)

      expect(heading('History')).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe("a territory's Info paragraph", () => {
    const hongKong: CountryShape = { ...france, name: 'Hong Kong', isoAlpha3: 'HKG' }
    const greenland: CountryShape = { ...france, name: 'Greenland', isoAlpha3: 'GRL' }
    const somaliland: CountryShape = {
      ...france,
      name: 'Somaliland',
      isoNumeric: null,
      isoAlpha3: null,
    }
    const infoHeading = () => screen.getByRole('button', { name: 'Info' })

    it('is only shown when asked for, and only for areas with a file', () => {
      const { unmount } = render(<CountryInfoPanel {...panelProps} country={hongKong} />)
      expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument()
      unmount()

      render(<CountryInfoPanel {...panelProps} country={greenland} showCountryInfo />)
      expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument()
    })

    it('starts closed, and opens and closes when its heading is pressed', async () => {
      render(<CountryInfoPanel {...panelProps} country={hongKong} showCountryInfo />)
      expect(infoHeading()).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(infoHeading())
      expect(await screen.findByText(/one country, two systems/)).toBeVisible()

      await userEvent.click(infoHeading())
      expect(infoHeading()).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByText(/one country, two systems/)).not.toBeVisible()
    })

    it('is found by map name for an area with no code', async () => {
      render(<CountryInfoPanel {...panelProps} country={somaliland} showCountryInfo />)

      await userEvent.click(infoHeading())
      expect(await screen.findByText(/^Somaliland declared independence/)).toBeVisible()
    })
  })
})
