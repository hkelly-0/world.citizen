import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { State } from 'ts-fsrs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveLearningGroup } from '../../shared/learningGroup'
import { saveProgress } from '../../shared/progress'
import { addDays, todayString } from './dates'
import type { DeckProgress } from './deck'
import { FlashcardsView } from './FlashcardsView'

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

const DISCOVERING = /^Discovering a new country/

const WARNING =
  "It's recommended to become more familiar with the countries you've already seen before learning new ones."

// The countries' areas, answered today and not due again until tomorrow, so
// the next card is always a new country. A low stability is soon forgotten (a
// recall chance in 14 days well under 80%); a high one is remembered.
function saveAreas(codes: string[], stability: number) {
  const today = todayString()
  const area = {
    stability,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    state: State.Review,
    lastReview: today,
    dueDate: addDays(today, 1),
  }
  saveProgress(Object.fromEntries(codes.map((code) => [code, { area }])))
}

function saveFranceArea(stability: number) {
  saveAreas(['FRA'], stability)
}

function renderClassic() {
  render(
    <FlashcardsView
      questionIds={['area']}
      learnedQuestionIds={['area']}
      globeKinds={['locate']}
      canDiscoverCountries={true}
      onBack={() => {}}
    />,
  )
}

// The Nordic Countries group (countryGroups.json).
const NORDIC_NAME = /^(Denmark|Norway|Sweden|Finland)$/

async function answerArea() {
  await userEvent.click(screen.getByRole('button', { name: '≥ 5M km² / Immense' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
}

describe('FlashcardsView', () => {
  beforeEach(() => localStorage.clear())

  it('warns before a new country while the seen ones are unfamiliar, once per visit', async () => {
    saveFranceArea(0.2)
    saveLearningGroup('nordic')
    render(
      <FlashcardsView
        questionIds={['area']}
        learnedQuestionIds={['area']}
        globeKinds={['locate']}
        canDiscoverCountries={true}
        onBack={() => {}}
      />,
    )

    expect(screen.getByText(WARNING)).toBeInTheDocument()
    expect(screen.queryByText('Area?')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Discover a new country anyway' }))

    // The discovering screen still comes before the new country's card, then
    // again for the next new one, with no warning.
    expect(screen.getByText(DISCOVERING)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    await answerArea()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
    expect(screen.getByText(DISCOVERING)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Area?')).toBeInTheDocument()
  })

  it('does not warn while the seen countries are familiar', async () => {
    saveFranceArea(10000)
    saveLearningGroup('nordic')
    render(
      <FlashcardsView
        questionIds={['area']}
        learnedQuestionIds={['area']}
        globeKinds={['locate']}
        canDiscoverCountries={true}
        onBack={() => {}}
      />,
    )

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
    expect(
      screen.getByText('Discovering a new country from Nordic Countries (1 of 4)...'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Area?')).toBeInTheDocument()
  })

  it('asks for a region on the globe first, then shows its countries', async () => {
    renderClassic()

    expect(screen.queryByText(DISCOVERING)).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Discover Nordic Countries' }))
    expect(
      screen.getByText('Discovering a new country from Nordic Countries (1 of 4)...'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByRole('heading', { name: NORDIC_NAME })).toBeInTheDocument()
  })

  it('keeps the chosen group pending when the screen is opened again', () => {
    saveAreas(['DNK'], 10000)
    saveLearningGroup('nordic')
    renderClassic()

    expect(screen.queryByRole('button', { name: /^Discover / })).not.toBeInTheDocument()
    expect(
      screen.getByText('Discovering a new country from Nordic Countries (2 of 4)...'),
    ).toBeInTheDocument()
  })

  it("asks for the next group after the group's last country", async () => {
    saveAreas(['DNK', 'NOR', 'SWE'], 10000)
    saveLearningGroup('nordic')
    renderClassic()

    expect(
      screen.getByText('Discovering a new country from Nordic Countries (4 of 4)...'),
    ).toBeInTheDocument()
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

  it('warns before the region globe while the seen countries are unfamiliar', async () => {
    saveFranceArea(0.2)
    renderClassic()

    expect(screen.getByText(WARNING)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Discover Nordic Countries' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Discover a new country anyway' }))
    expect(
      await screen.findByRole('button', { name: 'Discover Nordic Countries' }),
    ).toBeInTheDocument()
  })

  it("shows the Passport count going up after a new country's card, and a seen one's familiarity", async () => {
    // France is due today, so its card comes first, then a new country.
    const today = todayString()
    saveProgress({
      FRA: {
        area: {
          stability: 10000,
          difficulty: 5,
          reps: 1,
          lapses: 0,
          state: State.Review,
          lastReview: addDays(today, -1),
          dueDate: today,
        },
      },
    })
    saveLearningGroup('nordic')
    render(
      <FlashcardsView
        questionIds={['area']}
        learnedQuestionIds={['area']}
        globeKinds={['locate']}
        canDiscoverCountries={true}
        onBack={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '≥ 300K km² / Medium' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByLabelText('2/195')).not.toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Familiarity \d+%$/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    await answerArea()
    expect(screen.getByLabelText('2/195')).toBeInTheDocument()
    // Moves on (to a new country or the warning, depending on the random
    // country's answer).
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByLabelText('2/195')).not.toBeInTheDocument()
  })

  it('does not warn when no country has been seen', () => {
    render(
      <FlashcardsView
        questionIds={['area']}
        learnedQuestionIds={['area']}
        globeKinds={['locate']}
        canDiscoverCountries={true}
        onBack={() => {}}
      />,
    )

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it('counts only the questions being asked', () => {
    // France's area is unfamiliar, but only capitals are being practised.
    saveFranceArea(0.2)
    render(
      <FlashcardsView
        questionIds={['capital']}
        learnedQuestionIds={['capital']}
        globeKinds={['locate']}
        canDiscoverCountries={true}
        onBack={() => {}}
      />,
    )

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
  })

  describe('in Custom Practice', () => {
    it('shows countries in the Passport, even with a question never asked, without warning', async () => {
      // France's area is unfamiliar and its capital has never been asked.
      saveFranceArea(0.2)
      render(
        <FlashcardsView
          questionIds={['capital']}
          learnedQuestionIds={['capital']}
          globeKinds={['locate']}
          canDiscoverCountries={false}
          onBack={() => {}}
        />,
      )

      expect(screen.queryByText(WARNING)).not.toBeInTheDocument()
      expect(screen.queryByText(DISCOVERING)).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))
      await screen.findByText('Paris')
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))

      // No other country is in the Passport, so no new one comes next.
      expect(
        screen.getByText('No more cards today. Discover new countries in Classic Mode.'),
      ).toBeInTheDocument()
    })

    it('shows no cards when the Passport is empty', () => {
      render(
        <FlashcardsView
          questionIds={['area']}
          learnedQuestionIds={['area']}
          globeKinds={['locate']}
          canDiscoverCountries={false}
          onBack={() => {}}
        />,
      )

      expect(
        screen.getByText('No more cards today. Discover new countries in Classic Mode.'),
      ).toBeInTheDocument()
    })
  })
})
