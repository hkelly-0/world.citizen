import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GlobeSettings } from './GlobeSettings'

describe('GlobeSettings', () => {
  it('opens and closes the settings with the gear', async () => {
    render(<GlobeSettings isShowingRegions={false} onShowRegionsChange={() => {}} />)
    const gear = screen.getByRole('button', { name: 'Globe settings' })

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    await userEvent.click(gear)
    expect(screen.getByRole('switch', { name: 'Show Regions' })).not.toBeChecked()
    await userEvent.click(gear)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('flips Show Regions', async () => {
    const onShowRegionsChange = vi.fn()
    render(<GlobeSettings isShowingRegions={true} onShowRegionsChange={onShowRegionsChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Globe settings' }))
    const toggle = screen.getByRole('switch', { name: 'Show Regions' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)

    expect(onShowRegionsChange).toHaveBeenCalledWith(false)
  })
})
