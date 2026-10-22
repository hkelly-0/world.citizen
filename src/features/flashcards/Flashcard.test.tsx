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
    onAnswer: (pickedName: string, isCorrect: boolean) => void
  }) => (
    <div>
      <p>Select {countryName}</p>
      <button onClick={() => onAnswer(countryName, true)}>Tap right country</button>
      <button onClick={() => onAnswer('Sweden', false)}>Tap wrong country</button>
    </div>
  ),
}))

// France: area Medium, population Numerous, IHDI 8 - Great, capital Paris.
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
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
}

describe('Flashcard', () => {
  it("shows the country's picture", () => {
    render(<Flashcard country={france} onFinish={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
  })

  it('shows no picture for Tuvalu, which has none', () => {
    render(<Flashcard country={countryFacts['TUV']} onFinish={vi.fn()} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('skips the location question for Tuvalu, which has no outline to tap', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={countryFacts['TUV']} onFinish={onFinish} />)

    expect(screen.queryByText('Select Tuvalu')).not.toBeInTheDocument()
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('Teensy-weensy')
    await answerRangeQuestion('Minute')
    await answerRangeQuestion('6 - Ok')
    await answerCapital('Funafuti')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(expect.any(Number), 4)
  })

  it('asks location, area, population, IHDI, then capital, and reports 5 correct', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

    expect(await screen.findByText('Select France')).toBeInTheDocument()
    await answerLocation('Tap right country')
    expect(screen.getByText('Correct! France')).toBeInTheDocument()
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('Medium')
    expect(screen.getByText('Population?')).toBeInTheDocument()
    await answerRangeQuestion('Numerous')
    expect(screen.getByText('IHDI?')).toBeInTheDocument()
    await answerRangeQuestion('8 - Great')
    await answerCapital('paris')
    expect(screen.getByText('Correct! Paris')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(5, 5)
  })

  it('reveals the correct answer after a wrong pick and counts it as wrong', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

    await answerLocation('Tap wrong country')
    expect(screen.getByText('Wrong — you picked Sweden')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tiny' }))
    expect(screen.getByText("Wrong — it's Medium")).toBeInTheDocument()
    // Options can't be changed once answered.
    expect(screen.getByRole('button', { name: 'Medium' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await answerRangeQuestion('Numerous')
    await answerRangeQuestion('8 - Great')
    await answerCapital('Lyon')
    expect(screen.getByText("Wrong — it's Paris")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(2, 5)
  })

  it('offers "No data" for IHDI, which is correct for countries without one', async () => {
    render(<Flashcard country={countryFacts['VAT']} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Teensy-weensy')
    await answerRangeQuestion('Minute')
    await userEvent.click(screen.getByRole('button', { name: 'No data' }))

    expect(screen.getByText('Correct! No data')).toBeInTheDocument()
  })

  it('accepts any one capital for countries with several', async () => {
    render(<Flashcard country={countryFacts['ZAF']} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Large')
    await answerRangeQuestion('Numerous')
    await answerRangeQuestion('4 - Very Bad')
    await userEvent.type(screen.getByLabelText('Capital (any one of them)?'), 'Cape Town')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))

    expect(screen.getByText('Correct! Pretoria, Bloemfontein, Cape Town')).toBeInTheDocument()
  })
})
