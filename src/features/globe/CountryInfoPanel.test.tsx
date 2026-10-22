import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CountryShape } from '../../shared/countries'
import { CountryInfoPanel } from './CountryInfoPanel'

const france: CountryShape = {
  name: 'France',
  isoNumeric: '250',
  isoAlpha3: 'FRA',
  geometry: { type: 'Polygon', coordinates: [] },
}

describe('CountryInfoPanel', () => {
  it("shows the country's names and facts", () => {
    render(<CountryInfoPanel country={france} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByText('French Republic')).toBeInTheDocument()
    expect(screen.getByText('Capital')).toBeInTheDocument()
    expect(screen.getByText('Paris')).toBeInTheDocument()
    // Population, area and IHDI show range titles, not exact numbers.
    expect(screen.getByText('Numerous - ≥ 50M')).toBeInTheDocument()
    expect(screen.getByText('Medium - ≥ 300K km²')).toBeInTheDocument()
    expect(screen.getByText('Great - 8')).toBeInTheDocument()
  })

  it('lists every capital for countries with several', () => {
    const southAfrica: CountryShape = { ...france, name: 'South Africa', isoAlpha3: 'ZAF' }
    render(<CountryInfoPanel country={southAfrica} onClose={() => {}} />)

    expect(screen.getByText('Capitals')).toBeInTheDocument()
    expect(screen.getByText('Pretoria, Bloemfontein, Cape Town')).toBeInTheDocument()
  })

  it('shows "No data" when a country has no IHDI', () => {
    const vatican: CountryShape = { ...france, name: 'Vatican', isoAlpha3: 'VAT' }
    render(<CountryInfoPanel country={vatican} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Vatican City' })).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('marks an estimated IHDI with (est.)', () => {
    const saudiArabia: CountryShape = { ...france, name: 'Saudi Arabia', isoAlpha3: 'SAU' }
    render(<CountryInfoPanel country={saudiArabia} onClose={() => {}} />)

    expect(screen.getByText(/\(est\.\)$/)).toBeInTheDocument()
  })

  it('shows a note for map areas that are not one of the 195 countries', () => {
    const kosovo: CountryShape = { ...france, name: 'Kosovo', isoNumeric: null, isoAlpha3: null }
    render(<CountryInfoPanel country={kosovo} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Kosovo' })).toBeInTheDocument()
    expect(screen.getByText('Not one of the 195 countries in this app.')).toBeInTheDocument()
  })

  it('calls onClose when the close button is pressed', async () => {
    const onClose = vi.fn()
    render(<CountryInfoPanel country={france} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
