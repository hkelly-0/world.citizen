import { afterEach, describe, expect, it } from 'vitest'
import { loadProgress, saveProgress } from './progress'

describe('progress storage', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('starts empty when nothing is saved', () => {
    expect(loadProgress()).toEqual({})
  })

  it('loads what was saved', () => {
    const progress = {
      FRA: { repetitions: 1, easeFactor: 2.5, intervalDays: 1, dueDate: '2026-01-02' },
    }
    saveProgress(progress)
    expect(loadProgress()).toEqual(progress)
  })

  it('starts empty when the saved data is unreadable', () => {
    localStorage.setItem('geography-app/flashcard-progress', 'not json')
    expect(loadProgress()).toEqual({})
  })
})
