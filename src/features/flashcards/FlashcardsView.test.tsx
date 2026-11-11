import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { State } from 'ts-fsrs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countryFacts } from '../../shared/countryFacts'
import { saveLearningGroup } from '../../shared/learningGroup'
import { loadProgress, saveProgress } from '../../shared/progress'
import { recordPlayedCountry } from '../../shared/recentCountries'
import { loadReviewLog } from '../../shared/reviewLog'
import { loadUnfinishedCard, saveUnfinishedCard } from '../../shared/unfinishedCard'
import { todayString } from './dates'
import type { DeckProgress, GlobeKind, QuestionId } from './deck'
import type { AnswerResult } from './fsrs'
import { FlashcardsView } from './FlashcardsView'
import type { MultiCountryQuestionId } from './multiCountryQuestions'

// The region globe needs WebGL, which the test environment doesn't have. This
// stand-in offers a "Discover ..." button for each region it would tint.
vi.mock('../globe/RegionGlobe', async () => {
  const { groupsToChoose } = await import('../passport/passport')
  return {
    default: ({
      progress,
      onDiscover,
    }: {
      progress: DeckProgress
      onDiscover: (groupId: string) => void
    }) => (
      <div>
        {groupsToChoose(progress).map((choice) => (
          <button key={choice.id} onClick={() => onDiscover(choice.id)}>
            Discover {choice.name}
          </button>
        ))}
      </div>
    ),
  }
})

// The real globes need WebGL too. These stand-ins answer right.
vi.mock('../globe/LocateCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (result: AnswerResult) => void }) => (
    <button onClick={() => onAnswer('right')}>Locate</button>
  ),
}))
vi.mock('../globe/NameCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (isCorrect: boolean) => void }) => (
    <button onClick={() => onAnswer(true)}>Name</button>
  ),
}))

const DISCOVERING = /^Discovering a new country/

// The countries' areas, answered today. A low stability is soon forgotten (a
// recall chance in 14 days well under 75%); a high one is remembered.
function saveAreas(codes: string[], stability: number) {
  const area = {
    stability,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    state: State.Review,
    lastReview: todayString(),
  }
  saveProgress(Object.fromEntries(codes.map((code) => [code, { area }])))
}

// The codes of France and eleven others outside the Nordic Countries: more
// than the 10 played recently that can't come again, so a Passport country can
// always come.
function franceAndOthers(): string[] {
  const others = Object.values(countryFacts)
    .filter((country) => country.isoAlpha3 !== 'FRA' && country.groupId !== 'nordic')
    .slice(0, 11)
    .map((country) => country.isoAlpha3)
  return ['FRA', ...others]
}

function saveFranceArea(stability: number) {
  saveAreas(franceAndOthers(), stability)
}

// Today's first Classic card already played (on a made-up country, so none in
// the Passport counts as played recently), and every random value 0.9, so
// Classic's weighted pick lands on a Passport country rather than a new one.
function playPassportCountriesInClassic() {
  recordPlayedCountry('ZZZ', todayString(), true)
  vi.spyOn(Math, 'random').mockReturnValue(0.9)
}

function renderFlashcards(
  questionIds: QuestionId[],
  mode: 'classic' | 'custom',
  globeKinds: GlobeKind[] = ['locate'],
  multiCountryQuestionIds: MultiCountryQuestionId[] = [],
) {
  return render(
    <FlashcardsView
      countryIcon="outline"
      questionIds={questionIds}
      learnedQuestionIds={questionIds}
      globeKinds={globeKinds}
      multiCountryQuestionIds={multiCountryQuestionIds}
      mode={mode}
      onBack={() => {}}
    />,
  )
}

function renderClassic() {
  renderFlashcards(['area'], 'classic')
}

// The Nordic Countries group (countryGroups.json).
const NORDIC_NAME = /^(Denmark|Norway|Sweden|Finland)$/

// The name of the country whose card is shown.
function shownCountryName(): string {
  return screen.getByRole('heading', { level: 2 }).textContent!
}

function nameOf(code: string): string {
  return countryFacts[code].commonName
}

async function answerArea() {
  await userEvent.click(screen.getByRole('button', { name: '5M+ km² Immense' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
}

describe('FlashcardsView', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('plays a country from the Passport when the weighted pick lands on one', () => {
    saveFranceArea(0.2)
    saveLearningGroup('nordic')
    playPassportCountriesInClassic()
    renderClassic()

    expect(screen.queryByText(DISCOVERING)).not.toBeInTheDocument()
    expect(franceAndOthers().map(nameOf)).toContain(shownCountryName())
  })

  it('shows a new country when the weighted pick lands on it', async () => {
    saveFranceArea(0.2)
    saveLearningGroup('nordic')
    recordPlayedCountry('ZZZ', todayString(), true)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    renderClassic()

    expect(screen.getByText(DISCOVERING)).toHaveTextContent(
      'Discovering a new country from Nordic Countries (1 of 4)...',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Area?')).toBeInTheDocument()
  })

  it("shows a new country for the day's first Classic card, whatever the pick", () => {
    saveFranceArea(0.2)
    saveLearningGroup('nordic')
    // Played today, but not in Classic.
    recordPlayedCountry('ZZZ', todayString(), false)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    renderClassic()

    expect(screen.getByText(DISCOVERING)).toBeInTheDocument()
  })

  it('shows a new country when every Passport country was played recently', () => {
    saveAreas(['FRA'], 0.2)
    saveLearningGroup('nordic')
    recordPlayedCountry('FRA', todayString(), true)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    renderClassic()

    expect(screen.getByText(DISCOVERING)).toBeInTheDocument()
  })

  it('never shows a country played in the last 10 today', () => {
    saveFranceArea(0.2)
    // All but the first two, which are left to choose from.
    const [first, second, ...recent] = franceAndOthers()
    for (const code of recent) recordPlayedCountry(code, todayString(), true)
    for (const random of [0, 0.5, 0.99]) {
      vi.spyOn(Math, 'random').mockReturnValue(random)
      const { unmount } = renderFlashcards(['area'], 'custom')
      expect([first, second].map(nameOf)).toContain(shownCountryName())
      unmount()
    }
  })

  it('asks for a region on the globe first, then shows its countries', async () => {
    renderClassic()

    expect(screen.queryByText(DISCOVERING)).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Discover Nordic Countries' }))
    expect(screen.getByText(DISCOVERING)).toHaveTextContent(
      'Discovering a new country from Nordic Countries (1 of 4)...',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByRole('heading', { name: NORDIC_NAME })).toBeInTheDocument()
  })

  it('keeps the chosen group pending when the screen is opened again', () => {
    saveAreas(['DNK'], 10000)
    saveLearningGroup('nordic')
    renderClassic()

    expect(screen.queryByRole('button', { name: /^Discover / })).not.toBeInTheDocument()
    expect(screen.getByText(DISCOVERING)).toHaveTextContent(
      'Discovering a new country from Nordic Countries (2 of 4)...',
    )
  })

  it("asks for the next group after the group's last country", async () => {
    saveAreas(['DNK', 'NOR', 'SWE'], 10000)
    saveLearningGroup('nordic')
    // The weighted pick lands on a new country after the first card too.
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    renderClassic()

    expect(screen.getByText(DISCOVERING)).toHaveTextContent(
      'Discovering a new country from Nordic Countries (4 of 4)...',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    await answerArea()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(
      await screen.findByRole('button', { name: 'Discover Baltic States' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Discover Nordic Countries' }),
    ).not.toBeInTheDocument()
  })

  it('does not ask for a region when the pick lands on a Passport country', () => {
    saveFranceArea(0.2)
    playPassportCountriesInClassic()
    renderClassic()

    expect(screen.queryByRole('button', { name: /^Discover / })).not.toBeInTheDocument()
    expect(franceAndOthers().map(nameOf)).toContain(shownCountryName())
  })

  it("shows the Passport count going up after a new country's card", async () => {
    saveLearningGroup('nordic')
    renderClassic()

    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    await answerArea()
    expect(screen.getByLabelText('1/197')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByLabelText('1/197')).not.toBeInTheDocument()
  })

  it("shows a seen country's familiarity after its card", async () => {
    saveFranceArea(0.2)
    playPassportCountriesInClassic()
    renderClassic()

    const name = shownCountryName()
    await answerArea()
    expect(screen.getByText(name)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Familiarity \d+%$/ })).toBeInTheDocument()
  })

  it('saves each answer straight away, before the card is finished', async () => {
    saveFranceArea(0.2)
    playPassportCountriesInClassic()
    renderFlashcards(['area', 'capital'], 'classic')

    const code = franceAndOthers().find((code) => nameOf(code) === shownCountryName())!
    await userEvent.click(screen.getByRole('button', { name: '5M+ km² Immense' }))

    // The area was already reviewed today, so this is saved as a repeat.
    expect(loadProgress()[code].area!.latestRepeatAnswer).toEqual({
      date: todayString(),
      result: expect.any(String),
    })
    expect(loadReviewLog()).toEqual([
      { country: code, question: 'area', date: todayString(), result: expect.any(String) },
    ])
  })

  it('picks the kind of globe question at random when both are allowed', async () => {
    saveFranceArea(0.2)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    renderFlashcards(['globe'], 'custom', ['locate', 'name'])
    expect(await screen.findByRole('button', { name: 'Name' })).toBeInTheDocument()
  })

  it('always asks the one kind of globe question allowed', async () => {
    saveFranceArea(0.2)
    // A random value that would otherwise pick the location question.
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    renderFlashcards(['globe'], 'custom', ['name'])
    expect(await screen.findByRole('button', { name: 'Name' })).toBeInTheDocument()
  })

  describe('an unfinished card in Classic', () => {
    it('is resumed the same day at its next question', async () => {
      saveFranceArea(0.2)
      playPassportCountriesInClassic()
      const { unmount } = renderFlashcards(['area', 'capital'], 'classic')
      const name = shownCountryName()
      await answerArea()
      unmount()

      renderFlashcards(['area', 'capital'], 'classic')
      expect(shownCountryName()).toBe(name)
      expect(screen.queryByText('Area?')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Capital?')).toBeInTheDocument()
    })

    it("still ends with a new country's Passport count when resumed", async () => {
      saveLearningGroup('nordic')
      const { unmount } = renderFlashcards(['area', 'capital'], 'classic')
      await userEvent.click(screen.getByRole('button', { name: 'Go' }))
      await answerArea()
      unmount()

      // Already in the Passport, so no "Discovering" screen again.
      renderFlashcards(['area', 'capital'], 'classic')
      expect(screen.queryByText(DISCOVERING)).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByLabelText('1/197')).toBeInTheDocument()
    })

    it('is not resumed on a later day', () => {
      saveFranceArea(0.2)
      playPassportCountriesInClassic()
      saveUnfinishedCard({
        date: '2000-01-01',
        country: 'FRA',
        isNewCountry: false,
        isNameQuestion: false,
        offeredFlags: ['FRA'],
        answeredIds: ['area'],
      })
      renderClassic()

      // Resumed, France would have no question left; a new card asks the area.
      expect(screen.getByText('Area?')).toBeInTheDocument()
      expect(loadUnfinishedCard()!.date).toBe(todayString())
    })

    it('is not resumed before its first answer if its country was played since', () => {
      saveFranceArea(0.2)
      playPassportCountriesInClassic()
      // Chosen when the card before it finished, then played on its Passport card.
      saveUnfinishedCard({
        date: todayString(),
        country: 'FRA',
        isNewCountry: false,
        isNameQuestion: false,
        offeredFlags: ['FRA'],
        answeredIds: [],
      })
      recordPlayedCountry('FRA', todayString(), false)
      renderClassic()

      expect(shownCountryName()).not.toBe('France')
      expect(loadUnfinishedCard()!.country).not.toBe('FRA')
    })
  })

  describe('multi-country questions', () => {
    const BORDERS = /^Name up to 4 countries which border/

    it('in Classic, carries on the count of cards when opened again the same day', async () => {
      saveFranceArea(0.2)
      playPassportCountriesInClassic()
      const { unmount } = renderFlashcards(['area'], 'classic', ['locate'], ['borders'])
      await answerArea()
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      unmount()

      renderFlashcards(['area'], 'classic', ['locate'], ['borders'])
      await answerArea()
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText(BORDERS)).toBeInTheDocument()
    })

    it('in Classic, asks a due one first when left on the reward before it', async () => {
      saveFranceArea(0.2)
      playPassportCountriesInClassic()
      const { unmount } = renderFlashcards(['area'], 'classic', ['locate'], ['borders'])
      await answerArea()
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      await answerArea()
      unmount()

      renderFlashcards(['area'], 'classic', ['locate'], ['borders'])
      expect(screen.getByText(BORDERS)).toBeInTheDocument()
    })

    it('in Classic, asks a due one again when left before it is answered', async () => {
      saveFranceArea(0.2)
      playPassportCountriesInClassic()
      const { unmount } = renderFlashcards(['area'], 'classic', ['locate'], ['borders'])
      for (let card = 0; card < 2; card++) {
        await answerArea()
        await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      }
      expect(screen.getByText(BORDERS)).toBeInTheDocument()
      unmount()

      renderFlashcards(['area'], 'classic', ['locate'], ['borders'])
      expect(screen.getByText(BORDERS)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText('Area?')).toBeInTheDocument()
    })

    it('skips one the Passport cannot make, and waits another two cards', async () => {
      // Classic's case (the Custom Practice menu disables such questions),
      // tested in Custom Practice so no new countries are discovered.
      // Islands only, so Borders can't be asked; one for each of the five
      // cards, as a country played recently can't come again.
      saveAreas(['ISL', 'JAM', 'CUB', 'MDG', 'NZL'], 0.2)
      renderFlashcards(['area'], 'custom', ['locate'], ['borders'])

      for (let card = 0; card < 4; card++) {
        await answerArea()
        await userEvent.click(screen.getByRole('button', { name: 'Next' }))
        expect(screen.queryByText(BORDERS)).not.toBeInTheDocument()
        expect(screen.getByText('Area?')).toBeInTheDocument()
      }
    })
  })

  describe('in Custom Practice', () => {
    it('does not resume an unfinished card', async () => {
      // Two countries, as the one left part-way was played recently.
      saveAreas(['FRA', 'DEU'], 0.2)
      const { unmount } = renderFlashcards(['area', 'capital'], 'custom')
      const name = shownCountryName()
      await answerArea()
      unmount()

      renderFlashcards(['area', 'capital'], 'custom')
      expect(shownCountryName()).not.toBe(name)
      expect(screen.getByText('Area?')).toBeInTheDocument()
    })

    it('shows countries in the Passport, even with a question never asked', async () => {
      // France's area is unfamiliar and its capital has never been asked.
      saveAreas(['FRA'], 0.2)
      renderFlashcards(['capital'], 'custom')

      expect(screen.queryByText(DISCOVERING)).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
      await screen.findByText('Paris')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      // France is the only country in the Passport and was just played, so
      // none can come, and Custom Practice never brings a new one.
      expect(
        screen.getByText(
          "You've practiced all your Passport countries recently. Discover new countries in Classic Mode.",
        ),
      ).toBeInTheDocument()
    })

    it('never shows the same country twice in a row', async () => {
      saveAreas(['FRA', 'DEU'], 0.2)
      renderFlashcards(['area'], 'custom')

      const first = shownCountryName()
      await answerArea()
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      const second = shownCountryName()
      expect([first, second].sort()).toEqual(['France', 'Germany'])
    })

    it('moves on from the reward when Enter is pressed', async () => {
      saveAreas(['FRA', 'DEU'], 0.2)
      renderFlashcards(['area'], 'custom')

      const first = shownCountryName()
      await answerArea()
      await userEvent.keyboard('{Enter}')
      expect(shownCountryName()).not.toBe(first)
    })

    it('asks a multi-country question after every two cards', async () => {
      saveFranceArea(0.2)
      renderFlashcards(['area'], 'custom', ['locate'], ['borders'])
      const BORDERS = /^Name up to 4 countries which border/

      for (let round = 0; round < 2; round++) {
        await answerArea()
        await userEvent.click(screen.getByRole('button', { name: 'Next' }))
        expect(screen.queryByText(BORDERS)).not.toBeInTheDocument()
        await answerArea()
        await userEvent.click(screen.getByRole('button', { name: 'Next' }))
        expect(screen.getByText(BORDERS)).toBeInTheDocument()

        await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
        await userEvent.click(screen.getByRole('button', { name: 'Next' }))
        expect(screen.getByText('Area?')).toBeInTheDocument()
      }
    })

    it('shows no cards when the Passport is empty', () => {
      renderFlashcards(['area'], 'custom')

      expect(
        screen.getByText(
          'No countries in your Passport yet. Discover new countries in Classic Mode.',
        ),
      ).toBeInTheDocument()
    })
  })
})
