import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GlobeSettings } from './GlobeSettings'

describe('GlobeSettings', () => {
  it('opens and closes the settings with the gear', async () => {
    render(
      <GlobeSettings
        isShowingRegions={false}
        onShowRegionsChange={() => {}}
        isShowingPopulation={false}
        onShowPopulationChange={() => {}}
      />,
    )
    const gear = screen.getByRole('button', { name: 'Globe settings' })

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    await userEvent.click(gear)
    expect(screen.getByRole('switch', { name: 'Show Regions' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Show Population' })).not.toBeChecked()
    await userEvent.click(gear)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('flips Show Regions', async () => {
    const onShowRegionsChange = vi.fn()
    render(
      <GlobeSettings
        isShowingRegions={true}
        onShowRegionsChange={onShowRegionsChange}
        isShowingPopulation={false}
        onShowPopulationChange={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Globe settings' }))
    const toggle = screen.getByRole('switch', { name: 'Show Regions' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)

    expect(onShowRegionsChange).toHaveBeenCalledWith(false)
  })

  it('flips Show Population without touching Show Regions', async () => {
    const onShowRegionsChange = vi.fn()
    const onShowPopulationChange = vi.fn()
    render(
      <GlobeSettings
        isShowingRegions={false}
        onShowRegionsChange={onShowRegionsChange}
        isShowingPopulation={false}
        onShowPopulationChange={onShowPopulationChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Globe settings' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Show Population' }))

    expect(onShowPopulationChange).toHaveBeenCalledWith(true)
    expect(onShowRegionsChange).not.toHaveBeenCalled()
  })
})
