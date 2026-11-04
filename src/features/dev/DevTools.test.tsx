import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DevTools } from './DevTools'
import { setZoomShown } from './zoomDisplay'

afterEach(() => {
  cleanup()
  setZoomShown(false)
})

describe('DevTools zoom switch', () => {
  it('starts off, and turns on without remounting the current screen', () => {
    const onChange = vi.fn()
    render(<DevTools onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'dev' }))

    const zoomSwitch = screen.getByRole('checkbox', { name: 'Show zoom on globe' })
    expect(zoomSwitch).not.toBeChecked()

    fireEvent.click(zoomSwitch)

    expect(zoomSwitch).toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })
})
