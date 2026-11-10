import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { CountryTable } from './CountryTable'
import { formatStat, sortedCountries } from './countryOrdering'

// The table's body rows, as their cells' text.
function bodyRows() {
  const [, body] = screen.getAllByRole('rowgroup')
  return within(body)
    .getAllByRole('row')
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    )
}

// A column heading's button, found by the heading's text (its arrow aside).
function headingButton(text: string) {
  return screen.getByRole('button', { name: new RegExp(`^${text}`) })
}

describe('sortedCountries', () => {
  it('lists all 195 countries, largest first or, reversed, smallest first', () => {
    const largest = sortedCountries('area', false)
    expect(largest).toHaveLength(195)
    expect(largest[0].commonName).toBe('Russia')
    expect(sortedCountries('area', true)[0].commonName).toBe('Vatican City')
  })

  it('orders names A–Z or, reversed, Z–A', () => {
    expect(sortedCountries('name', false)[0].commonName).toBe('Afghanistan')
    expect(sortedCountries('name', true)[0].commonName).toBe('Zimbabwe')
  })

  it('puts countries with no IHDI last when largest first, and first when smallest first', () => {
    const noIhdi = ['Monaco', 'North Korea', 'Vatican City']
    expect(
      sortedCountries('ihdi', false)
        .slice(-3)
        .map((country) => country.commonName),
    ).toEqual(noIhdi)
    expect(
      sortedCountries('ihdi', true)
        .slice(0, 3)
        .map((country) => country.commonName),
    ).toEqual(noIhdi)
  })
})

describe('formatStat', () => {
  it('rounds like the rest of the app, and marks estimated or missing IHDIs', () => {
    expect(formatStat(countryFacts.RUS, 'area')).toBe('17M')
    expect(formatStat(countryFacts.VAT, 'area')).toBe('0.44')
    expect(formatStat(countryFacts.NOR, 'ihdi')).toMatch(/^\d\.\d$/)
    expect(formatStat(countryFacts.DMA, 'ihdi')).toMatch(/^\d\.\d \(est\.\)$/)
    expect(formatStat(countryFacts.PRK, 'ihdi')).toBe('no data')
  })
})

describe('CountryTable', () => {
  it('opens with every country and all three stats, ordered by area, largest first', () => {
    render(<CountryTable onBack={vi.fn()} />)
    const rows = bodyRows()
    expect(rows).toHaveLength(195)
    expect(rows[0]).toEqual([
      '1',
      'Russia',
      '17M',
      formatStat(countryFacts.RUS, 'population'),
      formatStat(countryFacts.RUS, 'ihdi'),
    ])
    const area = screen.getByRole('columnheader', { name: 'Area km² ▼' })
    expect(area).toHaveClass('is-ordered-by')
    expect(area).toHaveAttribute('aria-sort', 'descending')
  })

  it('orders by a tapped stat heading largest first, and reverses on a second tap', async () => {
    render(<CountryTable onBack={vi.fn()} />)

    await userEvent.click(headingButton('Population'))
    expect(bodyRows()[0][1]).toBe(sortedCountries('population', false)[0].commonName)
    expect(screen.getByRole('columnheader', { name: 'Population ▼' })).toHaveClass('is-ordered-by')
    expect(screen.getByRole('columnheader', { name: 'Area km²' })).not.toHaveClass('is-ordered-by')

    await userEvent.click(headingButton('Population'))
    expect(bodyRows()[0].slice(0, 2)).toEqual([
      '1',
      sortedCountries('population', true)[0].commonName,
    ])
    expect(screen.getByRole('columnheader', { name: 'Population ▲' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    // Another heading starts largest first again.
    await userEvent.click(headingButton('Area'))
    expect(bodyRows()[0][1]).toBe('Russia')
  })

  it('orders by name A–Z then Z–A, without rank numbers', async () => {
    render(<CountryTable onBack={vi.fn()} />)

    await userEvent.click(headingButton('Country'))
    expect(bodyRows()[0].slice(0, 2)).toEqual(['', 'Afghanistan'])
    expect(screen.getByRole('columnheader', { name: 'Country ▲' })).toHaveClass('is-ordered-by')

    await userEvent.click(headingButton('Country'))
    expect(bodyRows()[0].slice(0, 2)).toEqual(['', 'Zimbabwe'])
    expect(screen.getByRole('columnheader', { name: 'Country ▼' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('numbers only the countries with a value', async () => {
    render(<CountryTable onBack={vi.fn()} />)
    await userEvent.click(headingButton('IHDI'))
    const rows = bodyRows()
    expect(rows[191][0]).toBe('192')
    expect(rows[192]).toEqual(expect.arrayContaining(['', 'Monaco', 'no data']))

    await userEvent.click(headingButton('IHDI'))
    expect(bodyRows()[0][0]).toBe('')
    expect(bodyRows()[3][0]).toBe('1')
  })

  it('goes back with the back button', async () => {
    const onBack = vi.fn()
    render(<CountryTable onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: '← Extras' }))
    expect(onBack).toHaveBeenCalled()
  })
})
