import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { isInfoQuestion, QUESTION_IDS, type QuestionId } from './deck'
import { flagOptions } from './flagQuestion'
import { Flashcard } from './Flashcard'
import { reviewQuestion, type AnswerResult } from './fsrs'

// The real globes need WebGL, which jsdom doesn't have. These stand-ins have
// a button for each kind of answer.
vi.mock('../globe/LocateCountryGlobe', () => ({
  default: ({
    countryName,
    onAnswer,
  }: {
    countryName: string
    onAnswer: (result: AnswerResult) => void
  }) => (
    <div>
      <p>Select {countryName}</p>
      <button onClick={() => onAnswer('right')}>Tap right country</button>
      <button onClick={() => onAnswer('wrong')}>Tap wrong country</button>
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

// Keeps the flag options' order the same in every test.
const RANDOM = 0.9

// Every question but the info questions, which have their own tests.
const FACT_QUESTION_IDS = QUESTION_IDS.filter((id) => !isInfoQuestion(id))

// France: area Medium, population Numerous, IHDI 8  /  Great, capital Paris.
const france = countryFacts['FRA']

async function answerLocation(button: 'Tap right country' | 'Tap wrong country') {
  await userEvent.click(await screen.findByRole('button', { name: button }))
}

// Picks the country's own flag, or else any other offered flag, then goes on.
async function answerFlag(isoAlpha3: string, isCorrect: boolean) {
  const flags = screen.getAllByRole('button', { name: /^Flag \d$/ })
  const isOwnFlag = (button: HTMLElement) =>
    button.querySelector('img')!.getAttribute('src') === `/flags/${isoAlpha3}.svg`
  await userEvent.click(flags.find((button) => isOwnFlag(button) === isCorrect)!)
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
}

async function answerRangeQuestion(option: string) {
  await userEvent.click(screen.getByRole('button', { name: option.replace(/\s+/g, ' ') }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
}

async function answerCapital(typed: string) {
  await userEvent.type(screen.getByLabelText('Capital?'), typed)
  await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
}

// How each question was answered, from the calls to `onAnswer`.
function answersGiven(onAnswer: Mock): Partial<Record<QuestionId, AnswerResult>> {
  return Object.fromEntries(onAnswer.mock.calls.map(([id, result]) => [id, result]))
}

// Reveal waits for the country's info file to load.
async function revealInfo() {
  const reveal = screen.getByRole('button', { name: 'Reveal' })
  await vi.waitFor(() => expect(reveal).toBeEnabled())
  await userEvent.click(reveal)
}

describe('Flashcard', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(RANDOM)
  })

  it("shows the country's picture", () => {
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={vi.fn()}
        onFinish={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: 'Map of France' })).toHaveAttribute(
      'src',
      '/country-images/FRA.webp',
    )
  })

  it('shows a question mark instead of the flag until the flag question is answered', async () => {
    render(
      <Flashcard
        countryIcon="flag"
        country={france}
        questionIds={['flag', 'area']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={vi.fn()}
        onFinish={vi.fn()}
      />,
    )

    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Flag of France' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Map of France' })).not.toBeInTheDocument()
    await answerFlag('FRA', true)

    expect(screen.queryByText('?')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of France' })).toHaveAttribute(
      'src',
      '/flags/FRA.svg',
    )
  })

  it('shows the flag straight away when the flag question is not asked', () => {
    render(
      <Flashcard
        countryIcon="flag"
        country={france}
        questionIds={['area']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={vi.fn()}
        onFinish={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: 'Flag of France' })).toBeInTheDocument()
    expect(screen.queryByText('?')).not.toBeInTheDocument()
  })

  it('asks location, flag, area, population, IHDI, then capital, and reports all right', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    expect(await screen.findByText('Select France')).toBeInTheDocument()
    await answerLocation('Tap right country')
    expect(screen.getByText('Flag?')).toBeInTheDocument()
    await answerFlag('FRA', true)
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('≥ 300K km²  /  Medium')
    expect(screen.getByText('Population?')).toBeInTheDocument()
    await answerRangeQuestion('≥ 50M  /  Numerous')
    expect(screen.getByText('IHDI?')).toBeInTheDocument()
    await answerRangeQuestion('8  /  Great')
    await answerCapital('paris')
    expect(screen.getByLabelText('paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({
      globe: 'right',
      flag: 'right',
      area: 'right',
      population: 'right',
      ihdi: 'right',
      capital: 'right',
    })
  })

  it('asks to name the country on the globe instead, with isNameQuestion', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={true}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    expect(await screen.findByText('This is')).toBeInTheDocument()
    expect(screen.queryByText('Select France')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Type wrong name' }))
    expect(screen.getByText('Flag?')).toBeInTheDocument()
    await answerFlag('FRA', true)
    expect(screen.getByText('Area?')).toBeInTheDocument()
    await answerRangeQuestion('≥ 300K km²  /  Medium')
    await answerRangeQuestion('≥ 50M  /  Numerous')
    await answerRangeQuestion('8  /  Great')
    await answerCapital('paris')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({
      globe: 'wrong',
      flag: 'right',
      area: 'right',
      population: 'right',
      ihdi: 'right',
      capital: 'right',
    })
  })

  it('reveals the correct answer after a wrong pick and counts it as wrong', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    await answerLocation('Tap wrong country')
    await answerFlag('FRA', false)
    await userEvent.click(screen.getByRole('button', { name: '≥ 10K km² / Tiny' }))
    expect(screen.getByRole('button', { name: '≥ 10K km² / Tiny' })).toHaveClass(
      'flashcard__option--wrong',
    )
    expect(screen.getByRole('button', { name: '≥ 300K km² / Medium' })).toHaveClass(
      'flashcard__option--correct',
    )
    // Once answered, clicking any option goes on, like Next, without changing the answer.
    await userEvent.click(screen.getByRole('button', { name: '≥ 300K km² / Medium' }))
    expect(screen.getByText('Population?')).toBeInTheDocument()

    await answerRangeQuestion('≥ 50M  /  Numerous')
    await answerRangeQuestion('8  /  Great')
    await answerCapital('Lyon')
    expect(screen.getByText('Lyon')).toHaveClass('typed-answer__red')
    // The correct capital is typed out letter by letter.
    expect(await screen.findByText('Paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({
      globe: 'wrong',
      flag: 'wrong',
      area: 'wrong',
      population: 'right',
      ihdi: 'right',
      capital: 'wrong',
    })
  })

  it('offers four flags, names them once answered, counts a wrong pick as wrong, then goes on when one is clicked', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={['flag']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    const flags = screen.getAllByRole('button', { name: /^Flag \d$/ })
    expect(flags).toHaveLength(4)
    const wrongFlag = flags.find(
      (button) => button.querySelector('img')!.getAttribute('src') !== '/flags/FRA.svg',
    )!
    await userEvent.click(wrongFlag)

    // Once answered, each flag is labelled with its country.
    expect(wrongFlag).toHaveClass('flashcard__option--wrong')
    expect(screen.getByRole('button', { name: 'Flag of France' })).toHaveClass(
      'flashcard__option--correct',
    )
    expect(screen.getByText('France', { selector: '.flashcard__flag-name' })).toBeInTheDocument()
    // Clicking a flag now goes on, like Next, and doesn't change the answer.
    await userEvent.click(screen.getByRole('button', { name: 'Flag of France' }))

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(answersGiven(onAnswer)).toEqual({ flag: 'wrong' })
  })

  it('colours a pick one title away orange and counts it as close', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={['area']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '≥ 100K km² / Small' }))
    expect(screen.getByRole('button', { name: '≥ 100K km² / Small' })).toHaveClass(
      'flashcard__option--close',
    )
    expect(screen.getByRole('button', { name: '≥ 300K km² / Medium' })).toHaveClass(
      'flashcard__option--correct',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({ area: 'close' })
  })

  it('reveals the capital without any text typed, counting it as wrong', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    await answerLocation('Tap right country')
    await answerFlag('FRA', true)
    await answerRangeQuestion('≥ 300K km²  /  Medium')
    await answerRangeQuestion('≥ 50M  /  Numerous')
    await answerRangeQuestion('8  /  Great')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(await screen.findByText('Paris')).toHaveClass('typed-answer__green')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({
      globe: 'right',
      flag: 'right',
      area: 'right',
      population: 'right',
      ihdi: 'right',
      capital: 'wrong',
    })
  })

  it('offers "No data" for IHDI, which is correct for countries without one', async () => {
    render(
      <Flashcard
        countryIcon="outline"
        country={countryFacts['VAT']}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('VAT')}
        onAnswer={vi.fn()}
        onFinish={() => {}}
      />,
    )

    await answerLocation('Tap right country')
    await answerFlag('VAT', true)
    await answerRangeQuestion('< 10K km²  /  Teensy-weensy')
    await answerRangeQuestion('< 100K  /  Minute')
    await userEvent.click(screen.getByRole('button', { name: 'No data' }))

    expect(screen.getByRole('button', { name: 'No data' })).toHaveClass(
      'flashcard__option--correct',
    )
  })

  it('says the IHDI is estimated when the correct answer is our estimate', async () => {
    render(
      <Flashcard
        countryIcon="outline"
        country={countryFacts['SAU']}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('SAU')}
        onAnswer={vi.fn()}
        onFinish={() => {}}
      />,
    )

    await answerLocation('Tap right country')
    await answerFlag('SAU', true)
    await answerRangeQuestion('≥ 1M km²  /  Large')
    await answerRangeQuestion('≥ 10M  /  Moderate')
    expect(screen.queryByText(/Estimated/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '8 / Great' }))

    expect(screen.getByText(/Estimated: UNDP has no IHDI/)).toBeInTheDocument()
  })

  it('accepts any one capital for countries with several', async () => {
    render(
      <Flashcard
        countryIcon="outline"
        country={countryFacts['ZAF']}
        questionIds={FACT_QUESTION_IDS}
        isNameQuestion={false}
        offeredFlags={flagOptions('ZAF')}
        onAnswer={vi.fn()}
        onFinish={() => {}}
      />,
    )

    await answerLocation('Tap right country')
    await answerFlag('ZAF', true)
    await answerRangeQuestion('≥ 1M km²  /  Large')
    await answerRangeQuestion('≥ 50M  /  Numerous')
    await answerRangeQuestion('4  /  Very Bad')
    await userEvent.type(screen.getByLabelText('Capital (any one of them)?'), 'Cape Town')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(screen.getByLabelText('Cape Town')).toHaveClass('typed-answer__green')
  })

  it('asks only the chosen questions, and reports only their results', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={['population', 'capital']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    // No globe question, and the card starts at population.
    expect(screen.queryByText('Select France')).not.toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    await answerRangeQuestion('≥ 50M  /  Numerous')
    expect(screen.queryByText('IHDI?')).not.toBeInTheDocument()
    await answerCapital('Lyon')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({ population: 'right', capital: 'wrong' })
  })

  it('finishes after the last range question when the capital is not asked', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={['globe', 'area']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    await answerLocation('Tap right country')
    await answerRangeQuestion('≥ 10K km²  /  Tiny')

    expect(onFinish).toHaveBeenCalled()
    expect(answersGiven(onAnswer)).toEqual({ globe: 'right', area: 'wrong' })
  })

  it('finishes straight after the globe question when it is the only one asked', async () => {
    const onAnswer = vi.fn()
    const onFinish = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={['globe']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={onFinish}
      />,
    )

    await answerLocation('Tap wrong country')

    // The answer itself ends the card, so there is no Next.
    expect(onAnswer).toHaveBeenCalledWith('globe', 'wrong', true)
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('reports each answer as soon as it is given', async () => {
    const onAnswer = vi.fn()
    render(
      <Flashcard
        countryIcon="outline"
        country={france}
        questionIds={['area', 'capital']}
        isNameQuestion={false}
        offeredFlags={flagOptions('FRA')}
        onAnswer={onAnswer}
        onFinish={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '≥ 300K km² / Medium' }))
    // Before Next is pressed.
    expect(onAnswer).toHaveBeenCalledWith('area', 'right', false)
  })

  describe('when resumed', () => {
    it('skips the questions already answered', async () => {
      const onAnswer = vi.fn()
      const onFinish = vi.fn()
      render(
        <Flashcard
          countryIcon="outline"
          country={france}
          questionIds={FACT_QUESTION_IDS}
          isNameQuestion={false}
          offeredFlags={flagOptions('FRA')}
          answeredIds={['globe', 'flag', 'area']}
          onAnswer={onAnswer}
          onFinish={onFinish}
        />,
      )

      expect(screen.queryByText('Select France')).not.toBeInTheDocument()
      expect(screen.getByText('Population?')).toBeInTheDocument()
      await answerRangeQuestion('≥ 50M  /  Numerous')
      await answerRangeQuestion('8  /  Great')
      await answerCapital('Paris')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      expect(onFinish).toHaveBeenCalled()
      expect(answersGiven(onAnswer)).toEqual({
        population: 'right',
        ihdi: 'right',
        capital: 'right',
      })
    })

    it('shows the flag once past the flag question', () => {
      render(
        <Flashcard
          countryIcon="flag"
          country={france}
          questionIds={['flag', 'area']}
          isNameQuestion={false}
          offeredFlags={flagOptions('FRA')}
          answeredIds={['flag']}
          onAnswer={vi.fn()}
          onFinish={vi.fn()}
        />,
      )

      expect(screen.getByRole('img', { name: 'Flag of France' })).toBeInTheDocument()
      expect(screen.queryByText('?')).not.toBeInTheDocument()
    })
  })

  describe('info questions', () => {
    it('come after the capital, each revealed then rated, and the rating goes on', async () => {
      const onAnswer = vi.fn()
      const onFinish = vi.fn()
      render(
        <Flashcard
          countryIcon="outline"
          country={france}
          questionIds={['capital', 'history', 'internationalRelations']}
          isNameQuestion={false}
          offeredFlags={flagOptions('FRA')}
          // History has been answered before; International Relations hasn't.
          progress={{ history: reviewQuestion(undefined, 'right', '2026-10-01') }}
          onAnswer={onAnswer}
          onFinish={onFinish}
        />,
      )

      await answerCapital('Paris')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      // The topic only, until revealed.
      expect(screen.getByText('History')).toBeInTheDocument()
      expect(screen.queryByText(/^France was one of Europe's great powers/)).toBeNull()
      expect(screen.queryByRole('button', { name: 'Remembered' })).toBeNull()
      await revealInfo()
      expect(screen.getByText(/^France was one of Europe's great powers/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'Partly' }))

      // People and Economy aren't asked; the next topic starts hidden again.
      // Never answered before, its ratings ask how much was new instead.
      expect(screen.getByText('International Relations')).toBeInTheDocument()
      await revealInfo()
      expect(screen.queryByRole('button', { name: 'Forgot' })).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'New info' }))

      // The last rating ends the card, so there is no Next.
      expect(onAnswer).toHaveBeenLastCalledWith('internationalRelations', 'wrong', true)
      expect(onFinish).not.toHaveBeenCalled()
      expect(answersGiven(onAnswer)).toEqual({
        capital: 'right',
        history: 'close',
        internationalRelations: 'wrong',
      })
    })

    it('come after the borders question', async () => {
      const onAnswer = vi.fn()
      const onFinish = vi.fn()
      render(
        <Flashcard
          countryIcon="outline"
          country={france}
          questionIds={['economy']}
          isNameQuestion={false}
          offeredFlags={flagOptions('FRA')}
          asksBorders={true}
          onAnswer={onAnswer}
          onFinish={onFinish}
        />,
      )

      expect(screen.getByText('Name up to 4 countries which border France')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText('Economy')).toBeInTheDocument()
      await revealInfo()
      await userEvent.click(screen.getByRole('button', { name: 'Already known' }))

      expect(onAnswer).toHaveBeenLastCalledWith('economy', 'right', true)
      expect(onFinish).not.toHaveBeenCalled()
      expect(answersGiven(onAnswer)).toEqual({ economy: 'right' })
    })
  })

  describe('borders question', () => {
    function renderBorders(country = france, onAnswer = vi.fn(), onFinish = vi.fn()) {
      render(
        <Flashcard
          countryIcon="outline"
          country={country}
          questionIds={['capital']}
          isNameQuestion={false}
          offeredFlags={flagOptions(country.isoAlpha3)}
          asksBorders={true}
          onAnswer={onAnswer}
          onFinish={onFinish}
        />,
      )
    }

    async function typeBorder(box: number, typed: string) {
      await userEvent.type(screen.getByLabelText(`Bordering country ${box}`), typed)
    }

    it('comes after the capital, marks each box, lists every neighbour, and adds no result', async () => {
      const onAnswer = vi.fn()
      const onFinish = vi.fn()
      renderBorders(france, onAnswer, onFinish)

      await answerCapital('Paris')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText('Name up to 4 countries which border France')).toBeInTheDocument()

      // A right one, a wrong one, a repeat, and one left blank.
      await typeBorder(1, 'spain')
      await typeBorder(2, 'Portugal')
      await typeBorder(3, 'Spain')
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

      expect(screen.getByLabelText('Bordering country 1')).toHaveClass('typed-answer__box--correct')
      // Portugal doesn't border France, and Spain was already named.
      expect(screen.getByLabelText('Bordering country 2')).toHaveClass(
        'flashcard__border-box--wrong',
      )
      expect(screen.getByLabelText('Bordering country 3')).toHaveClass(
        'flashcard__border-box--wrong',
      )
      // France has more neighbours to name, so the blank box was a miss.
      expect(screen.getByLabelText('Bordering country 4')).toHaveClass(
        'flashcard__border-box--wrong',
      )
      const list = screen.getByRole('list', { name: 'Countries bordering France' })
      // Spain, the one named, comes first.
      expect([...list.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
        'Spain',
        'Andorra',
        'Belgium',
        'Brazil',
        'Germany',
        'Italy',
        'Luxembourg',
        'Monaco',
        'Suriname',
        'Switzerland',
      ])
      expect(screen.getByText('Spain', { selector: 'li' })).toHaveClass('flashcard__border--named')
      expect(screen.getByText('Italy', { selector: 'li' })).not.toHaveClass(
        'flashcard__border--named',
      )

      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(onFinish).toHaveBeenCalled()
      expect(answersGiven(onAnswer)).toEqual({ capital: 'right' })
    })

    it('moves to the next box on Enter, and reveals on Enter in the last box', async () => {
      renderBorders()
      await answerCapital('Paris')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      await userEvent.keyboard('Spain{Enter}')
      expect(screen.getByLabelText('Bordering country 2')).toHaveFocus()
      await userEvent.keyboard('{Enter}{Enter}')
      expect(screen.getByLabelText('Bordering country 4')).toHaveFocus()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()

      await userEvent.keyboard('Italy{Enter}')
      // The named ones come first, in the order typed.
      const list = screen.getByRole('list', { name: 'Countries bordering France' })
      expect([...list.querySelectorAll('li')].slice(0, 3).map((item) => item.textContent)).toEqual([
        'Spain',
        'Italy',
        'Andorra',
      ])
      expect(screen.getByLabelText('Bordering country 4')).toHaveClass('typed-answer__box--correct')
    })

    it('fills blank boxes with x, red for each missed neighbour and green for the rest', async () => {
      renderBorders(countryFacts['USA'])
      await answerCapital('Washington, D.C.')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      // The USA borders Canada and Mexico; only Canada is named. Box 3 holds only
      // spaces, which counts as blank.
      await typeBorder(1, 'Canada')
      await typeBorder(3, '  ')
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

      expect(screen.getByLabelText('Bordering country 1')).toHaveClass('typed-answer__box--correct')
      expect(screen.getByLabelText('Bordering country 2')).toHaveTextContent('x')
      expect(screen.getByLabelText('Bordering country 2')).toHaveClass(
        'flashcard__border-box--wrong',
      )
      for (const box of [3, 4]) {
        expect(screen.getByLabelText(`Bordering country ${box}`)).toHaveTextContent('x')
        expect(screen.getByLabelText(`Bordering country ${box}`)).toHaveClass(
          'typed-answer__box--correct',
        )
      }
    })

    it('counts a wrong answer as a guess, so no blank box is a miss', async () => {
      renderBorders(countryFacts['USA'])
      await answerCapital('Washington, D.C.')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      // Two guesses for the USA's two neighbours, one of them wrong.
      await typeBorder(1, 'ABC')
      await typeBorder(2, 'Mexico')
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

      expect(screen.getByLabelText('Bordering country 1')).toHaveClass(
        'flashcard__border-box--wrong',
      )
      for (const box of [2, 3, 4]) {
        expect(screen.getByLabelText(`Bordering country ${box}`)).toHaveClass(
          'typed-answer__box--correct',
        )
      }
    })

    it('is skipped for countries without land neighbours', async () => {
      const onAnswer = vi.fn()
      const onFinish = vi.fn()
      renderBorders(countryFacts['ISL'], onAnswer, onFinish)

      await answerCapital('Reykjavik')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      expect(onFinish).toHaveBeenCalled()
      expect(answersGiven(onAnswer)).toEqual({ capital: 'right' })
    })
  })
})
