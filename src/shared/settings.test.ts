import { afterEach, describe, expect, it } from 'vitest'
import { loadLearnedQuestionIds, saveLearnedQuestionIds } from './settings'

describe('settings storage', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('learns everything when nothing is saved', () => {
    expect(loadLearnedQuestionIds()).toEqual([
      'globe',
      'flag',
      'area',
      'population',
      'ihdi',
      'capital',
    ])
  })

  it('loads what was saved', () => {
    saveLearnedQuestionIds(['area', 'capital'])
    expect(loadLearnedQuestionIds()).toEqual(['area', 'capital'])
  })

  it('learns everything when the saved data is unreadable or empty', () => {
    localStorage.setItem('geography-app/learned-question-ids', 'not json')
    expect(loadLearnedQuestionIds()).toHaveLength(6)
    saveLearnedQuestionIds([])
    expect(loadLearnedQuestionIds()).toHaveLength(6)
  })
})
