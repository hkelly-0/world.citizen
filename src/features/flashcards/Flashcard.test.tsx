import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { Flashcard } from './Flashcard'

// The real globe needs WebGL, which jsdom doesn't have. This stand-in has a
// button for each kind of tap.
vi.mock('../globe/LocateCountryGlobe', () => ({
  default: ({
    countryName,
    onAnswer,
  }: {
    countryName: string
    onAnswer: (isCorrect: boolean) => void
  }) => (
    <div>
      <p>Select {countryName}</p>
      <button onClick={() => onAnswer(true)}>Tap right country</button>
      <button onClick={() => onAnswer(false)}>Tap wrong country</button>
    </div>
  ),
}))

// France: area Medium, population Numerous, IHDI Great - 8, capital Paris.
const france = countryFacts['FRA']

async function answerLocation(button: 'Tap right country' | 'Tap wrong country') {
  await userEvent.click(await screen.findByRole('button', { name: button }))
}

async function answerRangeQuestion(option: string) {
  await userEvent.click(screen.getByRole('button', { name: option }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
}

async function answerCapital(typed: string) {
  await userEvent.type(screen.getByLabelText('Capital?'), typed)
  await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
}

describe('Flashcard', () => {
  it("shows the country's picture", () => {
    render(<Flashcard country={france} onFinish={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
  })

  it('asks location, area, population, IHDI, then capital, and reports 5 correct', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

    expect(await screen.findByText('Select France')).toBeInTheDocument()
    await answerLocation('Tap right country')
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('Medium - ≥ 300K km²')
    expect(screen.getByText('Population?')).toBeInTheDocument()
    await answerRangeQuestion('Numerous - ≥ 50M')
    expect(screen.getByText('IHDI?')).toBeInTheDocument()
    await answerRangeQuestion('Great - 8')
    await answerCapital('paris')
    expect(screen.getByText('paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(5)
  })

  it('reveals the correct answer after a wrong pick and counts it as wrong', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

    await answerLocation('Tap wrong country')
    await userEvent.click(screen.getByRole('button', { name: 'Tiny - ≥ 10K km²' }))
    expect(screen.getByRole('button', { name: 'Tiny - ≥ 10K km²' })).toHaveClass('flashcard__option--wrong')
    expect(screen.getByRole('button', { name: 'Medium - ≥ 300K km²' })).toHaveClass(
      'flashcard__option--correct',
    )
    // Options can't be changed once answered.
    expect(screen.getByRole('button', { name: 'Medium - ≥ 300K km²' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await answerRangeQuestion('Numerous - ≥ 50M')
    await answerRangeQuestion('Great - 8')
    await answerCapital('Lyon')
    expect(screen.getByText('Lyon')).toHaveClass('typed-answer__red')
    // The correct capital is typed out letter by letter.
    expect(await screen.findByText('Paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(2)
  })

  it('reveals the capital without any text typed, counting it as wrong', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Medium - ≥ 300K km²')
    await answerRangeQuestion('Numerous - ≥ 50M')
    await answerRangeQuestion('Great - 8')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(await screen.findByText('Paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(4)
  })

  it('offers "No data" for IHDI, which is correct for countries without one', async () => {
    render(<Flashcard country={countryFacts['VAT']} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Teensy-weensy - < 10K km²')
    await answerRangeQuestion('Minute - < 100K')
    await userEvent.click(screen.getByRole('button', { name: 'No data' }))

    expect(screen.getByRole('button', { name: 'No data' })).toHaveClass('flashcard__option--correct')
  })

  it('says the IHDI is estimated when the correct answer is our estimate', async () => {
    render(<Flashcard country={countryFacts['SAU']} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Large - ≥ 1M km²')
    await answerRangeQuestion('Moderate - ≥ 10M')
    expect(screen.queryByText(/Estimated/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Great - 8' }))

    expect(screen.getByText(/Estimated: UNDP has no IHDI/)).toBeInTheDocument()
  })

  it('accepts any one capital for countries with several', async () => {
    render(<Flashcard country={countryFacts['ZAF']} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Large - ≥ 1M km²')
    await answerRangeQuestion('Numerous - ≥ 50M')
    await answerRangeQuestion('Very Bad - 4')
    await userEvent.type(screen.getByLabelText('Capital (any one of them)?'), 'Cape Town')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(screen.getByText('Cape Town')).toHaveClass('typed-answer__green')
  })
})
