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
    // Population, area and IHDI show the rounded value with the range's name.
    expect(valueOf('Population')).toHaveTextContent('67M Numerous')
    expect(valueOf('Area')).toHaveTextContent('550K km² Medium')
    expect(valueOf('IHDI')).toHaveTextContent('8.4 Great')
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
  })

  it('marks an estimated IHDI value with (est.)', () => {
    const saudiArabia: CountryShape = { ...france, name: 'Saudi Arabia', isoAlpha3: 'SAU' }
    render(<CountryInfoPanel {...panelProps} country={saudiArabia} />)

    expect(valueOf('IHDI')).toHaveTextContent('8.0 (est.) Great')
  })

  it('shows the value beside a range with no bound, e.g. "1.4 Billion"', () => {
    const india: CountryShape = { ...france, name: 'India', isoAlpha3: 'IND' }
    render(<CountryInfoPanel {...panelProps} country={india} />)

    expect(valueOf('Population')).toHaveTextContent(/^1\.\dB 1\.4 Billion$/)
  })

  it('says what a territory is, by ISO code or, with no code, by map name', () => {
    const greenland: CountryShape = { ...france, name: 'Greenland', isoAlpha3: 'GRL' }
    const { unmount } = render(<CountryInfoPanel {...panelProps} country={greenland} />)
    expect(screen.getByRole('heading', { name: 'Greenland' })).toBeInTheDocument()
    expect(screen.getByText(/^Autonomous territory of/)).toHaveTextContent(
      'Autonomous territory of Denmark',
    )
    unmount()

    const kosovo: CountryShape = { ...france, name: 'Kosovo', isoNumeric: null, isoAlpha3: null }
    render(<CountryInfoPanel {...panelProps} country={kosovo} />)
    expect(screen.getByText(/^Partially recognised state/)).toHaveTextContent(
      'Partially recognised state. Claimed by Serbia',
    )
  })

  it("selects a country when its name in a territory's subtitle is clicked", async () => {
    const onSelectCountry = vi.fn()
    const taiwan: CountryShape = { ...france, name: 'Taiwan', isoAlpha3: 'TWN' }
    render(<CountryInfoPanel {...panelProps} country={taiwan} onSelectCountry={onSelectCountry} />)

    await userEvent.click(screen.getByRole('button', { name: 'China' }))

    expect(onSelectCountry).toHaveBeenCalledWith('CHN')
  })

  it('shows a note for map areas with no subtitle', () => {
    const unknown: CountryShape = { ...france, name: 'Nowhere', isoNumeric: null, isoAlpha3: null }
    render(<CountryInfoPanel {...panelProps} country={unknown} />)

    expect(screen.getByText('Not one of the 195 countries in this app.')).toBeInTheDocument()
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
})
