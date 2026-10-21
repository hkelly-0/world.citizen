import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { Flashcard } from './Flashcard'

// France: area Medium, population Numerous, IHDI 8 - Great, capital Paris.
const france = countryFacts['FRA']

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

  it('asks area, population, IHDI, then capital, and reports 4 correct', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('Medium')
    expect(screen.getByText('Population?')).toBeInTheDocument()
    await answerRangeQuestion('Numerous')
    expect(screen.getByText('IHDI?')).toBeInTheDocument()
    await answerRangeQuestion('8 - Great')
    await answerCapital('paris')
    expect(screen.getByText('Correct! Paris')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalledWith(4)
  })

  it('reveals the correct answer after a wrong pick and counts it as wrong', async () => {
    const onFinish = vi.fn()
    render(<Flashcard country={france} onFinish={onFinish} />)

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

    expect(onFinish).toHaveBeenCalledWith(2)
  })

  it('offers "No data" for IHDI, which is correct for countries without one', async () => {
    render(<Flashcard country={countryFacts['VAT']} onFinish={() => {}} />)

    await answerRangeQuestion('Teensy-weensy')
    await answerRangeQuestion('Minute')
    await userEvent.click(screen.getByRole('button', { name: 'No data' }))

    expect(screen.getByText('Correct! No data')).toBeInTheDocument()
  })

  it('accepts any one capital for countries with several', async () => {
    render(<Flashcard country={countryFacts['ZAF']} onFinish={() => {}} />)

    await answerRangeQuestion('Large')
    await answerRangeQuestion('Numerous')
    await answerRangeQuestion('4 - Very Bad')
    await userEvent.type(screen.getByLabelText('Capital (any one of them)?'), 'Cape Town')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))

    expect(screen.getByText('Correct! Pretoria, Bloemfontein, Cape Town')).toBeInTheDocument()
  })
})
