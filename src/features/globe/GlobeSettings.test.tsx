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
        isShowingIhdi={false}
        onShowIhdiChange={() => {}}
      />,
    )
    const gear = screen.getByRole('button', { name: 'Globe settings' })

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    await userEvent.click(gear)
    expect(screen.getByRole('switch', { name: 'Regions' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Population' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'IHDI' })).not.toBeChecked()
    await userEvent.click(gear)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('flips Regions', async () => {
    const onShowRegionsChange = vi.fn()
    render(
      <GlobeSettings
        isShowingRegions={true}
        onShowRegionsChange={onShowRegionsChange}
        isShowingPopulation={false}
        onShowPopulationChange={() => {}}
        isShowingIhdi={false}
        onShowIhdiChange={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Globe settings' }))
    const toggle = screen.getByRole('switch', { name: 'Regions' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)

    expect(onShowRegionsChange).toHaveBeenCalledWith(false)
  })

  it('flips Population without touching Regions', async () => {
    const onShowRegionsChange = vi.fn()
    const onShowPopulationChange = vi.fn()
    render(
      <GlobeSettings
        isShowingRegions={false}
        onShowRegionsChange={onShowRegionsChange}
        isShowingPopulation={false}
        onShowPopulationChange={onShowPopulationChange}
        isShowingIhdi={false}
        onShowIhdiChange={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Globe settings' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Population' }))

    expect(onShowPopulationChange).toHaveBeenCalledWith(true)
    expect(onShowRegionsChange).not.toHaveBeenCalled()
  })

  it('flips IHDI without touching Regions or Population', async () => {
    const onShowRegionsChange = vi.fn()
    const onShowPopulationChange = vi.fn()
    const onShowIhdiChange = vi.fn()
    render(
      <GlobeSettings
        isShowingRegions={false}
        onShowRegionsChange={onShowRegionsChange}
        isShowingPopulation={false}
        onShowPopulationChange={onShowPopulationChange}
        isShowingIhdi={false}
        onShowIhdiChange={onShowIhdiChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Globe settings' }))
    await userEvent.click(screen.getByRole('switch', { name: 'IHDI' }))

    expect(onShowIhdiChange).toHaveBeenCalledWith(true)
    expect(onShowRegionsChange).not.toHaveBeenCalled()
    expect(onShowPopulationChange).not.toHaveBeenCalled()
  })
})
