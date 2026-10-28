import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomPracticeMenu } from './CustomPracticeMenu'
import { QUESTION_IDS } from './deck'

describe('CustomPracticeMenu', () => {
  it('lists the 13 options, all unticked, with Go disabled', () => {
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
      'Matching - Flags',
      'Matching - Capitals',
      'Ordering - Population',
      'Ordering - Area',
      'Ordering - IHDI',
    ]) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked()
    }
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('splits the options into Country Fundamentals and Multi-Country Questions', () => {
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={vi.fn()} />)

    const labelsIn = (heading: string) =>
      within(screen.getByRole('group', { name: heading }))
        .getAllByRole('checkbox')
        .map((box) => box.parentElement!.textContent)
    expect(labelsIn('Country Fundamentals')).toEqual([
      'Locate country on globe',
      'Name country from globe',
      'Flag',
      'Area',
      'Population',
      'IHDI',
      'Capital',
      'Borders',
      'History',
      'People',
      'Economy',
      'Int. Relations',
    ])
    expect(labelsIn('Multi-Country Questions')).toEqual([
      'Matching - Flags',
      'Matching - Capitals',
      'Ordering - Population',
      'Ordering - Area',
      'Ordering - IHDI',
    ])
  })

  it('leaves out Multi-Country Questions when none of them is offered', () => {
    render(<CustomPracticeMenu learnedQuestionIds={['globe']} onBack={vi.fn()} onGo={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Country Fundamentals' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Multi-Country Questions' })).toBeNull()
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

  it('practises Flag Matching and the Orderings apart from the rest', async () => {
    const onGo = vi.fn()
    render(<CustomPracticeMenu learnedQuestionIds={QUESTION_IDS} onBack={vi.fn()} onGo={onGo} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('checkbox', { name: 'Matching - Flags' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ordering - IHDI' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Matching - Flags' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Ordering - Area' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith([], [], false, ['flag-matching', 'ihdi-ordering'])
  })

  it('offers only the question types learned in Settings, plus Borders', () => {
    // Flag Matching isn't offered, as the flag question isn't learned, but
    // Capital Matching is.
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
      'Matching - Capitals',
    ])
  })
  it("offers each Ordering only if its stat's question type is learned", () => {
    render(<CustomPracticeMenu learnedQuestionIds={['area']} onBack={vi.fn()} onGo={vi.fn()} />)

    expect(screen.getAllByRole('checkbox').map((box) => box.parentElement!.textContent)).toEqual([
      'Area',
      'Borders',
      'Ordering - Area',
    ])
  })
})
