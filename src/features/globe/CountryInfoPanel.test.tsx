import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CountryShape } from '../../shared/countries'
import { CountryInfoPanel } from './CountryInfoPanel'

const peru: CountryShape = {
  name: 'Peru',
  isoNumeric: '604',
  isoAlpha3: 'PER',
  geometry: { type: 'Polygon', coordinates: [] },
}

describe('CountryInfoPanel', () => {
  it('shows the country name and ISO codes', () => {
    render(<CountryInfoPanel country={peru} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Peru' })).toBeInTheDocument()
    expect(screen.getByText('PER')).toBeInTheDocument()
    expect(screen.getByText('604')).toBeInTheDocument()
  })

  it('shows "None" when a country has no ISO codes', () => {
    const kosovo: CountryShape = { ...peru, name: 'Kosovo', isoNumeric: null, isoAlpha3: null }
    render(<CountryInfoPanel country={kosovo} onClose={() => {}} />)

    expect(screen.getAllByText('None')).toHaveLength(2)
  })

  it('calls onClose when the close button is pressed', async () => {
    const onClose = vi.fn()
    render(<CountryInfoPanel country={peru} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
