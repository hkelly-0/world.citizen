import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { QUESTION_IDS } from './deck'
import { Flashcard } from './Flashcard'

// The real globes need WebGL, which jsdom doesn't have. These stand-ins have
// a button for each kind of answer.
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

vi.mock('../globe/NameCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (isCorrect: boolean) => void }) => (
    <div>
      <p>This is</p>
      <button onClick={() => onAnswer(true)}>Type right name</button>
      <button onClick={() => onAnswer(false)}>Type wrong name</button>
    </div>
  ),
}))

// The card asks the name question when Math.random() is below 0.5.
const LOCATION_QUESTION_RANDOM = 0.9
const NAME_QUESTION_RANDOM = 0.1

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
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(LOCATION_QUESTION_RANDOM)
  })

  it("shows the country's picture", () => {
    render(<Flashcard country={france} questionIds={QUESTION_IDS} onFinish={vi.fn()} />)

    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
  })

  it('asks location, area, population, IHDI, then capital, and reports all right', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={QUESTION_IDS} onFinish={onFinish} />)

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

    expect(onFinish).toHaveBeenCalledWith({
      globe: true,
      area: true,
      population: true,
      ihdi: true,
      capital: true,
    })
  })

  it('asks to name the country on the globe instead, half the time', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(NAME_QUESTION_RANDOM)
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={QUESTION_IDS} onFinish={onFinish} />)

    expect(await screen.findByText('This is')).toBeInTheDocument()
    expect(screen.queryByText('Select France')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Type wrong name' }))
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('Medium - ≥ 300K km²')
    await answerRangeQuestion('Numerous - ≥ 50M')
    await answerRangeQuestion('Great - 8')
    await answerCapital('paris')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith({
      globe: false,
      area: true,
      population: true,
      ihdi: true,
      capital: true,
    })
  })

  it('reveals the correct answer after a wrong pick and counts it as wrong', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={QUESTION_IDS} onFinish={onFinish} />)

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

    expect(onFinish).toHaveBeenCalledWith({
      globe: false,
      area: false,
      population: true,
      ihdi: true,
      capital: false,
    })
  })

  it('reveals the capital without any text typed, counting it as wrong', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={QUESTION_IDS} onFinish={onFinish} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Medium - ≥ 300K km²')
    await answerRangeQuestion('Numerous - ≥ 50M')
    await answerRangeQuestion('Great - 8')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(await screen.findByText('Paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith({
      globe: true,
      area: true,
      population: true,
      ihdi: true,
      capital: false,
    })
  })

  it('offers "No data" for IHDI, which is correct for countries without one', async () => {
    render(<Flashcard country={countryFacts['VAT']} questionIds={QUESTION_IDS} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Teensy-weensy - < 10K km²')
    await answerRangeQuestion('Minute - < 100K')
    await userEvent.click(screen.getByRole('button', { name: 'No data' }))

    expect(screen.getByRole('button', { name: 'No data' })).toHaveClass('flashcard__option--correct')
  })

  it('says the IHDI is estimated when the correct answer is our estimate', async () => {
    render(<Flashcard country={countryFacts['SAU']} questionIds={QUESTION_IDS} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Large - ≥ 1M km²')
    await answerRangeQuestion('Moderate - ≥ 10M')
    expect(screen.queryByText(/Estimated/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Great - 8' }))

    expect(screen.getByText(/Estimated: UNDP has no IHDI/)).toBeInTheDocument()
  })

  it('accepts any one capital for countries with several', async () => {
    render(<Flashcard country={countryFacts['ZAF']} questionIds={QUESTION_IDS} onFinish={() => {}} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Large - ≥ 1M km²')
    await answerRangeQuestion('Numerous - ≥ 50M')
    await answerRangeQuestion('Very Bad - 4')
    await userEvent.type(screen.getByLabelText('Capital (any one of them)?'), 'Cape Town')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(screen.getByText('Cape Town')).toHaveClass('typed-answer__green')
  })

  it('asks only the chosen questions, and reports only their results', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={['population', 'capital']} onFinish={onFinish} />)

    // No globe question, and the card starts at population.
    expect(screen.queryByText('Select France')).not.toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    await answerRangeQuestion('Numerous - ≥ 50M')
    expect(screen.queryByText('IHDI?')).not.toBeInTheDocument()
    await answerCapital('Lyon')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith({ population: true, capital: false })
  })

  it('finishes after the last range question when the capital is not asked', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={['globe', 'area']} onFinish={onFinish} />)

    await answerLocation('Tap right country')
    await answerRangeQuestion('Tiny - ≥ 10K km²')

    expect(onFinish).toHaveBeenCalledWith({ globe: true, area: false })
  })

  it('finishes straight after the globe question when it is the only one asked', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} questionIds={['globe']} onFinish={onFinish} />)

    await answerLocation('Tap wrong country')

    expect(onFinish).toHaveBeenCalledWith({ globe: false })
  })
})
