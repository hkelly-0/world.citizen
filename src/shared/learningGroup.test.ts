import { afterEach, describe, expect, it } from 'vitest'
import { clearLearningGroup, loadLearningGroup, saveLearningGroup } from './learningGroup'

describe('learning group storage', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('is null when nothing is saved', () => {
    expect(loadLearningGroup()).toBeNull()
  })

  it('loads what was saved, until cleared', () => {
    saveLearningGroup('nordic')
    expect(loadLearningGroup()).toBe('nordic')
    clearLearningGroup()
    expect(loadLearningGroup()).toBeNull()
  })

  it('is null when the saved id is not a group', () => {
    localStorage.setItem('geography-app/learning-group', 'atlantis')
    expect(loadLearningGroup()).toBeNull()
  })
})
