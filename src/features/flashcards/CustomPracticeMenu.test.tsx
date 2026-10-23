import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomPracticeMenu } from './CustomPracticeMenu'
import { QUESTION_IDS } from './deck'

describe('CustomPracticeMenu', () => {
  it('lists the 6 options, all unticked, with Go disabled', () => {
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={vi.fn()} />)

    for (const label of [
      'Locate country on globe',
      'Name country from globe',
      'Area',
      'Population',
      'IHDI',
      'Capital',
    ]) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked()
    }
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('passes the ticked question types to onGo, in the usual question order', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Name country from globe' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Population' }))
    // Unticking removes it again.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Population' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith(['globe', 'capital'], ['name'])
  })

  it('treats both globe options as the one globe question type', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Name country from globe' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Locate country on globe' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith(['globe'], ['locate', 'name'])
  })

  it('disables Go again when every box is unticked', async () => {
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('offers only the question types learned in Settings', () => {
    render(
      <CustomPracticeMenu learnedQuestionIds={['globe', 'capital']} onBack={vi.fn()} onGo={vi.fn()} />,
    )

    expect(screen.getAllByRole('checkbox').map((box) => box.parentElement!.textContent)).toEqual([
      'Locate country on globe',
      'Name country from globe',
      'Capital',
    ])
  })
})
