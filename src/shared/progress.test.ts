import { State } from 'ts-fsrs'
import { afterEach, describe, expect, it } from 'vitest'
import { loadDiscoveries, recordDiscovery } from './discoveries'
import { loadProgress, removeOldSm2Progress, saveProgress } from './progress'

describe('progress storage', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('starts empty when nothing is saved', () => {
    expect(loadProgress()).toEqual({})
  })

  it('loads what was saved', () => {
    const progress = {
      FRA: {
        capital: {
          stability: 10,
          difficulty: 5,
          reps: 1,
          lapses: 0,
          state: State.Review,
          lastReview: '2026-01-01',
        },
      },
    }
    saveProgress(progress)
    expect(loadProgress()).toEqual(progress)
  })

  it('starts empty when the saved data is unreadable', () => {
    localStorage.setItem('geography-app/fsrs-progress', 'not json')
    expect(loadProgress()).toEqual({})
  })

  it('deletes SM-2 progress and the discovery times with it, keeping FSRS progress', () => {
    const progress = {
      FRA: {
        capital: {
          stability: 10,
          difficulty: 5,
          reps: 1,
          lapses: 0,
          state: State.Review,
          lastReview: '2026-01-01',
        },
      },
    }
    saveProgress(progress)
    localStorage.setItem('geography-app/question-progress', '{"PER":{}}')
    recordDiscovery('PER', new Date('2026-10-20T09:00:00Z'))

    removeOldSm2Progress()
    expect(localStorage.getItem('geography-app/question-progress')).toBeNull()
    expect(loadDiscoveries()).toEqual({})
    expect(loadProgress()).toEqual(progress)
  })

  it('keeps discovery times when there is no SM-2 progress', () => {
    recordDiscovery('PER', new Date('2026-10-20T09:00:00Z'))
    removeOldSm2Progress()
    expect(loadDiscoveries()).toEqual({ PER: '2026-10-20T09:00:00.000Z' })
  })
})
