import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WhatCountsAsCountry } from './WhatCountsAsCountry'

describe('WhatCountsAsCountry', () => {
  it('links to Wikipedia’s list of sovereign states, outside the app', () => {
    render(<WhatCountsAsCountry onBack={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'List of sovereign states' })
    expect(link).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/List_of_sovereign_states')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('goes back when the back button is pressed', async () => {
    const onBack = vi.fn()
    render(<WhatCountsAsCountry onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /Extras/ }))
    expect(onBack).toHaveBeenCalled()
  })
})
