import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomPracticeMenu } from './CustomPracticeMenu'

describe('CustomPracticeMenu', () => {
  it('lists the 5 question types, all unticked, with Go disabled', () => {
    render(<CustomPracticeMenu onBack={vi.fn()} onGo={vi.fn()} />)

    for (const label of ['Location', 'Area', 'Population', 'IHDI', 'Capital']) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked()
    }
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('passes the ticked question types to onGo, in the usual question order', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Location' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Population' }))
    // Unticking removes it again.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Population' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith(['globe', 'capital'])
  })

  it('disables Go again when every box is unticked', async () => {
    render(<CustomPracticeMenu onBack={vi.fn()} onGo={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })
})
