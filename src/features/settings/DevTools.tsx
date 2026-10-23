import { useState } from 'react'
import { clearDiscoveries, recordDiscovery } from '../../shared/discoveries'
import { loadProgress, saveProgress } from '../../shared/progress'
import { clearReviewLog } from '../../shared/reviewLog'
import { todayString } from '../flashcards/dates'
import type { DeckProgress } from '../flashcards/deck'
import { COUNTRY_COUNT } from '../passport/passport'
import {
  addCountries,
  makeAllDueToday,
  makeNothingDueToday,
  randomUnseenCountries,
  skipAheadDays,
} from './devProgress'
import './DevTools.css'

const SKIP_DAYS = [1, 7, 30]
// How many countries each "Add" button puts in the Passport.
const ADD_COUNT = 10

// Buttons that change the saved flashcard progress, for testing different
// flashcard situations. Shown at the bottom of Settings on the dev server only.
// Each change is saved straight away; the other screens read it when opened.
export function DevTools() {
  // What the last button did, so it's clear it worked.
  const [message, setMessage] = useState<string | null>(null)

  function change(
    newProgress: (progress: DeckProgress, today: string) => DeckProgress,
    done: string,
  ) {
    saveProgress(newProgress(loadProgress(), todayString()))
    setMessage(done)
  }

  function add(count: number, kind: 'well-known' | 'shaky') {
    const progress = loadProgress()
    const codes = randomUnseenCountries(progress, count)
    saveProgress(addCountries(progress, codes, kind, todayString()))
    // So they sort by Date discovered like countries found in the flashcards.
    for (const code of codes) recordDiscovery(code, new Date())
    setMessage(`Added ${codes.length} ${kind} countries.`)
  }

  function reset() {
    saveProgress({})
    clearDiscoveries()
    clearReviewLog()
    setMessage('Progress, discovery times and review log cleared.')
  }

  return (
    <section className="dev-tools">
      <h2 className="dev-tools__title">Developer</h2>
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
        onClick={() => add(ADD_COUNT, 'well-known')}
      >
        Add {ADD_COUNT} well-known countries
      </button>
      <button type="button" className="dev-tools__button" onClick={() => add(ADD_COUNT, 'shaky')}>
        Add {ADD_COUNT} shaky countries
      </button>
      <button
        type="button"
        className="dev-tools__button"
        onClick={() => add(COUNTRY_COUNT, 'well-known')}
      >
        Collect all {COUNTRY_COUNT} (well known)
      </button>
      <button
        type="button"
        className="dev-tools__button"
        onClick={() => change(makeAllDueToday, 'Every seen country is due today.')}
      >
        Make all seen due today
      </button>
      <button
        type="button"
        className="dev-tools__button"
        onClick={() => change(makeNothingDueToday, 'Nothing seen is due today.')}
      >
        Nothing due today
      </button>
      <button type="button" className="dev-tools__button dev-tools__button--danger" onClick={reset}>
        Reset progress
      </button>
      {message !== null && <p className="dev-tools__message">{message}</p>}
    </section>
  )
}
