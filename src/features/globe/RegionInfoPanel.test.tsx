import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RegionInfoPanel } from './RegionInfoPanel'

// The real module creates MapLibre maps, which can't run in tests. Two of
// Western Europe's countries are enough here.
vi.mock('./countryMap', () => ({
  COUNTRY_SHAPES: [
    { name: 'France', isoAlpha3: 'FRA' },
    { name: 'Belgium', isoAlpha3: 'BEL' },
  ],
  countryIndicesInGroup: () => [0, 1],
}))

describe('RegionInfoPanel', () => {
  it("shows the region's name and its countries in alphabetical order", () => {
    render(
      <RegionInfoPanel groupId="western-europe" onClose={() => {}} onSelectCountry={() => {}} />,
    )

    expect(screen.getByRole('heading', { name: 'Western Europe' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Belgium',
      'France',
    ])
  })

  it("passes a clicked country's position in COUNTRY_SHAPES", async () => {
    const onSelectCountry = vi.fn()
    render(
      <RegionInfoPanel
        groupId="western-europe"
        onClose={() => {}}
        onSelectCountry={onSelectCountry}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'France' }))

    expect(onSelectCountry).toHaveBeenCalledWith(0)
  })
})
