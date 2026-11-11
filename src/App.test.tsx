import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { State } from 'ts-fsrs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { todayString } from './features/flashcards/dates'
import type { AnswerResult } from './features/flashcards/fsrs'
import { HOME_CARD_REWARD_NOTE } from './features/tutorial/tutorialNotes'
import { saveLearningGroup } from './shared/learningGroup'
import { loadProgress, saveProgress } from './shared/progress'
import { loadLearnedQuestionIds, saveLearnedQuestionIds } from './shared/settings'
import { loadHasSeenTutorial, saveHasSeenTutorial } from './shared/tutorial'

// The flashcards' globe questions need WebGL too. These stand-ins answer
// correctly when their button is clicked.
vi.mock('./features/globe/LocateCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (result: AnswerResult) => void }) => (
    <button onClick={() => onAnswer('right')}>Answer globe question</button>
  ),
}))
vi.mock('./features/globe/NameCountryGlobe', () => ({
  default: ({ onAnswer }: { onAnswer: (isCorrect: boolean) => void }) => (
    <button onClick={() => onAnswer(true)}>Answer globe question</button>
  ),
}))

// The globe screen, as opened by "See on Globe".
vi.mock('./features/globe/GlobeView', () => ({
  default: ({
    initialCountryCode,
    backLabel,
    onBack,
  }: {
    initialCountryCode?: string
    backLabel?: string
    onBack: () => void
  }) => (
    <div>
      <p>Globe showing {initialCountryCode}</p>
      <button onClick={onBack}>{backLabel}</button>
    </div>
  ),
}))

vi.mock('./features/extras/NameEveryCountry', () => ({
  default: ({ area, onBack }: { area: { name: string }; onBack: () => void }) => (
    <button onClick={onBack}>Finish game in {area.name}</button>
  ),
}))

// The globe screen needs WebGL, which the test environment doesn't have, so
// only the menu and flashcards screens are tested here.
describe('App', () => {
  // A group of countries is being learned, so Classic goes straight to a new
  // country instead of first asking for a group. The tutorial has been seen,
  // so the main menu doesn't offer it.
  beforeEach(() => {
    saveLearningGroup('nordic')
    saveHasSeenTutorial()
  })

  afterEach(() => {
    localStorage.clear()
    // Screens add history entries, so start each test back on the menu's.
    history.replaceState(null, '')
  })

  it('opens on a main menu with the title, subtitle, Globe, Flashcards, Extras and Settings', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(screen.getByText('learn every country')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Globe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extras' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('opens Name every country for an area from the Extras menu, and its Done goes back to the Extras menu', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Extras' }))
    expect(screen.getByRole('heading', { name: 'Name every country in…' })).toBeInTheDocument()
    const areaButtons = ['The World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania']
    for (const name of areaButtons) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole('button', { name: 'Europe' }))
    expect(history.state).toEqual({ screen: 'name-every-country', namingAreaId: 'europe' })
    await userEvent.click(await screen.findByRole('button', { name: 'Finish game in Europe' }))

    expect(await screen.findByRole('heading', { name: 'Extras' })).toBeInTheDocument()
  })

  it('opens classic flashcards from the flashcards menu, and goes back to the main menu', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByRole('button', { name: 'Custom Practice' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Flag?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it("goes from classic flashcards to the main menu with the browser's back button", async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Flag?')).toBeInTheDocument()

    history.back()
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it("goes back to the menu with the browser's back button", async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByRole('button', { name: 'Classic Mode' })).toBeInTheDocument()

    history.back()
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('opens custom practice from the flashcards menu, and goes back to the main menu', async () => {
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Custom Practice' }))
    expect(screen.getByText('Select which question types to see today')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('saves progress after finishing a card', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    // The country and globe question are random, but every card starts with
    // a globe question.
    await userEvent.click(await screen.findByRole('button', { name: 'Answer globe question' }))

    // Pick the first option each time (button 0 is "← Menu", 1 is "See on
    // Globe") for the flag and the three range questions, then type a
    // capital. Right or wrong, the card gets saved.
    for (let i = 0; i < 4; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: /./ })[2])
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    }
    await userEvent.type(screen.getByRole('textbox'), 'Nowhere')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    // Then the four info questions, each revealed (once the country's info
    // file has loaded) and rated, worded for a first viewing.
    for (let i = 0; i < 4; i++) {
      const reveal = screen.getByRole('button', { name: 'Reveal' })
      await vi.waitFor(() => expect(reveal).toBeEnabled())
      await userEvent.click(reveal)
      await userEvent.click(screen.getByRole('button', { name: 'Already known' }))
    }

    const saved = JSON.parse(localStorage.getItem('geography-app/fsrs-progress') ?? '{}')
    expect(Object.keys(saved)).toHaveLength(1)
    // Each of the country's 10 questions has its own progress.
    const [countryProgress] = Object.values(saved) as object[]
    expect(Object.keys(countryProgress).sort()).toEqual([
      'area',
      'capital',
      'economy',
      'flag',
      'globe',
      'history',
      'ihdi',
      'internationalRelations',
      'people',
      'population',
    ])
  })

  it('opens the card\'s country on the globe with "See on Globe", and goes back to the card', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // Not on the discovery screen, which doesn't name the country.
    expect(screen.queryByRole('button', { name: 'See on Globe' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Answer globe question' }))

    const country = screen.getByRole('heading', { level: 2 }).textContent
    await userEvent.click(screen.getByRole('button', { name: 'See on Globe' }))
    expect(await screen.findByText(/Globe showing [A-Z]{3}/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← Flashcards' }))
    // The same card, still past its globe question.
    await vi.waitFor(() => expect(screen.queryByText(/Globe showing/)).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(country ?? '')
    expect(screen.queryByRole('button', { name: 'Answer globe question' })).not.toBeInTheDocument()
  })

  it('practises only the ticked question types, and saves progress for just those', async () => {
    // Custom Practice only shows countries in the Passport, so put France in
    // it: its area answered today.
    const today = todayString()
    const franceArea = {
      stability: 10,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      state: State.Review,
      lastReview: today,
    }
    saveProgress({ FRA: { area: franceArea } })
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Custom Practice' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))

    // Straight to the capital: no globe or range questions.
    expect(screen.queryByRole('button', { name: 'Answer globe question' })).not.toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox'), 'Nowhere')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // France's capital is now saved; its area is untouched.
    const saved = JSON.parse(localStorage.getItem('geography-app/fsrs-progress') ?? '{}')
    expect(Object.keys(saved)).toEqual(['FRA'])
    expect(Object.keys(saved.FRA)).toEqual(['area', 'capital'])
    expect(saved.FRA.area).toEqual(franceArea)

    // Back goes straight to the main menu.
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()
  })

  it('saves settings, then asks only the learned questions in Classic and offers only them in Custom Practice', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const unticked = ['Location', 'Flag', 'Area', 'Population', 'IHDI']
    unticked.push('History', 'People', 'Economy', 'Int. Relations')
    for (const label of unticked) {
      await userEvent.click(screen.getByRole('checkbox', { name: label }))
    }

    // Each change is saved straight away, and the last ticked box can't be unticked.
    expect(screen.getByRole('checkbox', { name: 'Capital' })).toBeDisabled()
    expect(JSON.parse(localStorage.getItem('geography-app/learned-question-ids')!)).toEqual([
      'capital',
    ])
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    expect(await screen.findByRole('button', { name: 'Flashcards' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Custom Practice' }))
    // Borders isn't in Settings, so it is always offered; Capital Matching is
    // offered as Capital is learned. Both are disabled, as the
    // Passport is empty.
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'Capital' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Borders' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Matching - Capitals' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Flashcards' }))
    await userEvent.click(screen.getByRole('button', { name: 'Classic Mode' }))
    // A new country is introduced before its card.
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    // Straight to the capital: no globe, flag or range questions.
    expect(screen.queryByRole('button', { name: 'Answer globe question' })).not.toBeInTheDocument()
    expect(screen.queryByText('Flag?')).not.toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeInTheDocument()
  })

  it('keeps a settings change after going back and reopening Settings', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Area' }))
    await userEvent.click(screen.getByRole('button', { name: '← Menu' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('checkbox', { name: 'Area' })).not.toBeChecked()
    expect(loadLearnedQuestionIds()).not.toContain('area')
  })
})

describe('Tutorial', () => {
  afterEach(() => {
    localStorage.clear()
    history.replaceState(null, '')
  })

  // A first visit shows the main menu with "Play Tutorial", which opens it.
  async function renderAndPlayTutorial() {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Play Tutorial' }))
  }

  it('is offered on the first visit, and Skip goes to the main menu without the offer', async () => {
    const { unmount } = render(<App />)

    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Play Tutorial' }))
    expect(screen.getByRole('heading', { name: 'Welcome to world.citizen' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }))
    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play Tutorial' })).not.toBeInTheDocument()
    expect(loadHasSeenTutorial()).toBe(true)

    unmount()
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Play Tutorial' })).not.toBeInTheDocument()
  })

  it('disables the Flashcards menu options until it is played from there', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))

    expect(screen.getByRole('button', { name: 'Classic Mode' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Custom Practice' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Play Tutorial' }))
    expect(screen.getByRole('heading', { name: 'Welcome to world.citizen' })).toBeInTheDocument()

    // Skip returns to the main menu, and the Flashcards menu is back to normal.
    await userEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }))
    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Flashcards' }))
    expect(screen.getByRole('button', { name: 'Classic Mode' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Play Tutorial' })).not.toBeInTheDocument()
  })

  it('asks "Exit tutorial?" on back; Cancel stays and Yes goes to the main menu for good', async () => {
    await renderAndPlayTutorial()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(history.state).toEqual({ tutorialGuard: true })

    history.back()
    expect(await screen.findByRole('dialog', { name: 'Exit tutorial?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search countries' })).toBeInTheDocument()
    expect(history.state).toEqual({ tutorialGuard: true })

    history.back()
    await screen.findByRole('dialog', { name: 'Exit tutorial?' })
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(history.state).toBeNull()
    expect(loadHasSeenTutorial()).toBe(true)
  })

  it("takes the tutorial's history entry off on Skip, so back doesn't ask", async () => {
    await renderAndPlayTutorial()
    await userEvent.click(screen.getByRole('button', { name: 'Skip tutorial' }))

    await vi.waitFor(() => expect(history.state).toBeNull())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
  })

  it("isn't offered to someone with countries in their Passport", () => {
    const franceArea = {
      stability: 10,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      state: State.Review,
      lastReview: todayString(),
    }
    saveProgress({ FRA: { area: franceArea } })
    render(<App />)

    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play Tutorial' })).not.toBeInTheDocument()
  })

  it('plays the home country, then shows the Passport, Settings and the Flashcards menu', async () => {
    saveLearnedQuestionIds(['globe', 'flag'])
    await renderAndPlayTutorial()

    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Search countries' }), 'irel')
    await userEvent.click(screen.getByRole('button', { name: 'Ireland' }))
    expect(screen.getByText(/primarily a flashcard app/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // The home country's card, with a note above each question.
    await userEvent.click(await screen.findByRole('button', { name: 'Answer globe question' }))
    expect(screen.getByText(/Next is its flag/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Flag 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    // Every question type is asked, though only the globe and flag are learned.
    for (const question of ['Area?', 'Population?', 'IHDI?']) {
      expect(screen.getByText(question)).toBeInTheDocument()
      // Any range will do; the largest is listed first.
      await userEvent.click(screen.getAllByRole('button', { name: /^\d/ })[0])
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    }
    await userEvent.type(screen.getByLabelText('Capital?'), 'Dublin')
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    for (const topic of ['History', 'People', 'Economy', 'International Relations']) {
      expect(screen.getByText(topic)).toBeInTheDocument()
      // Reveal waits for the country's info file to load.
      const reveal = screen.getByRole('button', { name: 'Reveal' })
      await vi.waitFor(() => expect(reveal).toBeEnabled())
      await userEvent.click(reveal)
      await userEvent.click(screen.getByRole('button', { name: 'New info' }))
    }
    expect(screen.getByText('Ireland ✓')).toBeInTheDocument()
    expect(screen.getByText(HOME_CARD_REWARD_NOTE)).toBeInTheDocument()
    expect(Object.keys(loadProgress())).toEqual(['IRL'])
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('heading', { name: /Passport/ })).toBeInTheDocument()
    expect(screen.getByText(/This is your Passport/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    // Two notes on Familiarity, still over the Passport.
    expect(screen.getByText(/beside each name is its Familiarity/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Passport/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Familiarity increases whenever/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Passport/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Settings starts with the suggested question types ticked and saved, and
    // saves each change.
    expect(screen.getByRole('checkbox', { name: 'Location' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Population' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'IHDI' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Capital' })).not.toBeChecked()
    expect(loadLearnedQuestionIds()).toEqual(['globe', 'population', 'ihdi'])
    await userEvent.click(screen.getByRole('checkbox', { name: 'Location' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capital' }))
    expect(loadLearnedQuestionIds()).toEqual(['population', 'ihdi', 'capital'])
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(loadLearnedQuestionIds()).toEqual(['population', 'ihdi', 'capital'])

    expect(screen.getByRole('heading', { name: 'Flashcards' })).toBeInTheDocument()
    expect(screen.getByText(/Classic Mode is the main way to learn/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Finish tutorial' }))

    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(screen.getByText('1/197')).toBeInTheDocument()
    expect(loadHasSeenTutorial()).toBe(true)
  })

  it("opens again from Settings' Replay tutorial", async () => {
    saveHasSeenTutorial()
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }))

    expect(screen.getByRole('heading', { name: 'Welcome to world.citizen' })).toBeInTheDocument()

    // Back asks first, then Yes returns to the main menu, not Settings.
    history.back()
    await screen.findByRole('dialog', { name: 'Exit tutorial?' })
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByRole('heading', { name: 'world.citizen' })).toBeInTheDocument()
    expect(history.state).toBeNull()
  })
})
