import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomPracticeMenu } from './CustomPracticeMenu'
import { countryFacts } from '../../shared/countryFacts'
import { QUESTION_IDS } from './deck'

// A Passport with every country, which can make every multi-country question.
const ALL_CODES = Object.keys(countryFacts)

describe('CustomPracticeMenu', () => {
  beforeEach(() => localStorage.clear())

  it('lists the 13 options, all unticked, with Go disabled', () => {
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

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
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

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
      'History',
      'People',
      'Economy',
      'Int. Relations',
    ])
    expect(labelsIn('Multi-Country Questions')).toEqual([
      'Borders',
      'Matching - Flags',
      'Matching - Capitals',
      'Ordering - Population',
      'Ordering - Area',
      'Ordering - IHDI',
    ])
  })

  it('leaves out Country Fundamentals when none of them is offered', () => {
    render(
      <CustomPracticeMenu
        learnedQuestionIds={[]}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    expect(screen.queryByRole('group', { name: 'Country Fundamentals' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Multi-Country Questions' })).toBeInTheDocument()
  })

  it('passes the ticked question types to onGo, in the usual question order', async () => {
    const onGo = vi.fn()
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={onGo}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Name country from globe' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Population' }))
    // Unticking removes it again.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Population' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith(['globe', 'capital'], ['name'], [])
  })

  it('treats both globe options as the one globe question type', async () => {
    const onGo = vi.fn()
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={onGo}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Name country from globe' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Locate country on globe' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith(['globe'], ['locate', 'name'], [])
  })

  it('disables Go again when every box is unticked', async () => {
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
  })

  it('practises Borders, Flag Matching and the Orderings apart from the rest', async () => {
    const onGo = vi.fn()
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={onGo}
      />,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    expect(screen.getByRole('checkbox', { name: 'Matching - Flags' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ordering - IHDI' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Matching - Flags' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Borders' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Ordering - Area' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    expect(onGo).toHaveBeenCalledWith([], [], ['borders', 'flag-matching', 'ihdi-ordering'])
  })

  it('offers only the question types learned in Settings, plus Borders', () => {
    // Flag Matching isn't offered, as the flag question isn't learned, but
    // Capital Matching is.
    render(
      <CustomPracticeMenu
        learnedQuestionIds={['globe', 'capital']}
        passportCodes={ALL_CODES}
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
    render(
      <CustomPracticeMenu
        learnedQuestionIds={['area']}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('checkbox').map((box) => box.parentElement!.textContent)).toEqual([
      'Area',
      'Borders',
      'Ordering - Area',
    ])
  })

  it('opens with the boxes ticked when Go was last pressed', async () => {
    const { unmount } = render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    unmount()

    const onGo = vi.fn()
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={onGo}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Capital' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Area' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Flag' })).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onGo).toHaveBeenCalledWith(['area', 'capital'], [], [])
  })

  it('remembers nothing ticked without pressing Go', async () => {
    const { unmount } = render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    unmount()

    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Capital' })).not.toBeChecked()
  })

  it('leaves out remembered boxes no longer offered', async () => {
    const { unmount } = render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Flag' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    unmount()

    // The flag question has since been unticked in Settings.
    const onGo = vi.fn()
    render(
      <CustomPracticeMenu
        learnedQuestionIds={['capital']}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={onGo}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onGo).toHaveBeenCalledWith(['capital'], [], [])
  })

  it('leaves out remembered multi-country boxes ticked alongside the others', async () => {
    // Saved before Borders moved to Multi-Country Questions.
    localStorage.setItem(
      'geography-app/custom-practice-choices',
      JSON.stringify(['capital', 'borders']),
    )
    const onGo = vi.fn()
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={onGo}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Borders' })).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onGo).toHaveBeenCalledWith(['capital'], [], [])
  })

  it("disables the multi-country questions the Passport can't make, with a note", () => {
    // All three are islands, so Borders can't be asked, and three countries
    // are too few for Matching.
    render(
      <CustomPracticeMenu
        learnedQuestionIds={['flag']}
        passportCodes={['ISL', 'FJI', 'JAM']}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Flag' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Matching - Flags' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeDisabled()
    expect(
      within(screen.getByRole('group', { name: 'Multi-Country Questions' })).getByText(
        'Some options require more countries in your Passport',
      ),
    ).toBeInTheDocument()
  })

  it('shows no note when the Passport can make every multi-country question', () => {
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={ALL_CODES}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    expect(screen.queryByText('Some options require more countries in your Passport')).toBeNull()
  })

  it("leaves out remembered multi-country boxes the Passport can't make", () => {
    localStorage.setItem(
      'geography-app/custom-practice-choices',
      JSON.stringify(['borders', 'flag-matching']),
    )
    render(
      <CustomPracticeMenu
        learnedQuestionIds={QUESTION_IDS}
        passportCodes={['FRA', 'ESP', 'ITA']}
        onBack={vi.fn()}
        onGo={vi.fn()}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Matching - Flags' })).not.toBeChecked()
  })
})
