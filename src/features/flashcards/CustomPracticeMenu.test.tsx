import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomPracticeMenu } from './CustomPracticeMenu'
import { QUESTION_IDS } from './deck'

describe('CustomPracticeMenu', () => {
  it('lists the 12 options, all unticked, with Go disabled', () => {
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={vi.fn()} />)

    for (const label of [
      'Locate country on globe',
      'Name country from globe',
      'Flag',
      'Area',
      'Population',
      'IHDI',
      'Capital',
      'Borders',
      'Flag Matching',
      'Ranking - Population',
      'Ranking - Area',
      'Ranking - IHDI',
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

    expect(onGo).toHaveBeenCalledWith(['globe', 'capital'], ['name'], false, [])
  })

  it('treats both globe options as the one globe question type', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Name country from globe' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Locate country on globe' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith(['globe'], ['locate', 'name'], false, [])
  })

  it('passes Borders separately, as it is not a question type', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Borders' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith([], [], true, [])
  })

  it('disables Go again when every box is unticked', async () => {
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('practises Flag Matching and the Rankings apart from the rest', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('checkbox', { name: 'Flag Matching' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ranking - IHDI' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Flag Matching' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Ranking - Area' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith([], [], false, ['flag-matching', 'ihdi-ranking'])
  })

  it('offers only the question types learned in Settings, plus Borders', () => {
    // Flag Matching isn't offered, as the flag question isn't learned.
    render(
      <CustomPracticeMenu
        learnedQuestionIds={['globe', 'capital']}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('checkbox').map((box) => box.parentElement!.textContent)).toEqual([
      'Locate country on globe',
      'Name country from globe',
      'Capital',
      'Borders',
    ])
  })
  it("offers each Ranking only if its stat's question type is learned", () => {
    render(<CustomPracticeMenu learnedQuestionIds={['area']} onBack={vi.fn()} onGo={vi.fn()} />)

    expect(screen.getAllByRole('checkbox').map((box) => box.parentElement!.textContent)).toEqual([
      'Area',
      'Borders',
      'Ranking - Area',
    ])
  })
})
