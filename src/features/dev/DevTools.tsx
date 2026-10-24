import { useState } from 'react'
import { clearDiscoveries, recordDiscovery } from '../../shared/discoveries'
import { clearLearningGroup } from '../../shared/learningGroup'
import { loadProgress, saveProgress } from '../../shared/progress'
import { clearReviewLog } from '../../shared/reviewLog'
import { todayString } from '../flashcards/dates'
import type { DeckProgress } from '../flashcards/deck'
import { COUNTRY_GROUPS } from '../../shared/countryFacts'
import { COUNTRY_COUNT } from '../passport/passport'
import { areCountryGroupsShown, setCountryGroupsShown } from './showCountryGroups'
import {
  addCountries,
  makeAllSeenToday,
  skipAheadDays,
  unseenCountriesInRandomGroups,
} from './devProgress'
import './DevTools.css'

const SKIP_DAYS = [1, 7, 30]
// How many country groups each "Add" button puts in the Passport.
const ADD_GROUP_COUNT = 3

type DevToolsProps = {
  // Called after each change, so the current screen can be rebuilt with the
  // new progress.
  onChange: () => void
}

// Buttons that change the saved flashcard progress, for testing different
// flashcard situations, and a switch that tints the globes by country group. Shown on every screen, on the dev server only, as a
// "dev" tab on the right edge that opens and closes the buttons. Each change
// is saved straight away.
export function DevTools({ onChange }: DevToolsProps) {
  const [isOpen, setIsOpen] = useState(false)
  // What the last button did, so it's clear it worked.
  const [message, setMessage] = useState<string | null>(null)
  const [isShowingGroups, setIsShowingGroups] = useState(areCountryGroupsShown)

  function finish(done: string) {
    setMessage(done)
    onChange()
  }

  function change(
    newProgress: (progress: DeckProgress, today: string) => DeckProgress,
    done: string,
  ) {
    saveProgress(newProgress(loadProgress(), todayString()))
    finish(done)
  }

  function add(groupCount: number, kind: 'well-known' | 'shaky') {
    const progress = loadProgress()
    const codes = unseenCountriesInRandomGroups(progress, groupCount)
    saveProgress(addCountries(progress, codes, kind, todayString()))
    // So they sort by Date discovered like countries found in the flashcards.
    for (const code of codes) recordDiscovery(code, new Date())
    finish(`Added ${codes.length} ${kind} countries.`)
  }

  function showGroups(shown: boolean) {
    setCountryGroupsShown(shown)
    setIsShowingGroups(shown)
    finish(shown ? 'Globes show country groups.' : 'Globes back to normal.')
  }

  function reset() {
    saveProgress({})
    clearDiscoveries()
    clearReviewLog()
    clearLearningGroup()
    finish('Progress, discovery times, review log and chosen group cleared.')
  }

  return (
    <div className="dev-tools">
      {isOpen && (
        <section className="dev-tools__panel">
          <div className="dev-tools__row">
            <span>Skip ahead</span>
            {SKIP_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                className="dev-tools__button"
                onClick={() =>
                  change(
                    (progress) => skipAheadDays(progress, days),
                    `Skipped ahead ${days} day${days === 1 ? '' : 's'}.`,
                  )
                }
              >
                +{days}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="dev-tools__button"
            onClick={() => add(ADD_GROUP_COUNT, 'well-known')}
          >
            Add {ADD_GROUP_COUNT} well-known regions
          </button>
          <button
            type="button"
            className="dev-tools__button"
            onClick={() => add(ADD_GROUP_COUNT, 'shaky')}
          >
            Add {ADD_GROUP_COUNT} shaky regions
          </button>
          <button
            type="button"
            className="dev-tools__button"
            onClick={() => add(COUNTRY_GROUPS.length, 'well-known')}
          >
            Collect all {COUNTRY_COUNT} (well known)
          </button>
          <button
            type="button"
            className="dev-tools__button"
            onClick={() => change(makeAllSeenToday, 'Every seen country was last reviewed today.')}
          >
            Make all seen today
          </button>
          <button
            type="button"
            className="dev-tools__button dev-tools__button--danger"
            onClick={reset}
          >
            Reset progress
          </button>
          <label className="dev-tools__row">
            <input
              type="checkbox"
              checked={isShowingGroups}
              onChange={(event) => showGroups(event.target.checked)}
            />
            Show country groups on globes
          </label>
          {message !== null && <p className="dev-tools__message">{message}</p>}
        </section>
      )}
      <button
        type="button"
        className="dev-tools__toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        dev
      </button>
    </div>
  )
}
