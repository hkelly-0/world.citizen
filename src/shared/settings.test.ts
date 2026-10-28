import { afterEach, describe, expect, it } from 'vitest'
import { QUESTION_IDS } from '../features/flashcards/deck'
import {
  loadCountryIcon,
  loadLearnedQuestionIds,
  saveCountryIcon,
  saveLearnedQuestionIds,
} from './settings'

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
      'history',
      'people',
      'economy',
      'internationalRelations',
    ])
  })

  it('loads what was saved', () => {
    saveLearnedQuestionIds(['area', 'capital'])
    expect(loadLearnedQuestionIds()).toEqual(['area', 'capital'])
  })

  it('learns everything when the saved data is unreadable or empty', () => {
    localStorage.setItem('geography-app/learned-question-ids', 'not json')
    expect(loadLearnedQuestionIds()).toHaveLength(QUESTION_IDS.length)
    saveLearnedQuestionIds([])
    expect(loadLearnedQuestionIds()).toHaveLength(QUESTION_IDS.length)
  })

  it('shows outlines until another country icon is saved', () => {
    expect(loadCountryIcon()).toBe('outline')
    saveCountryIcon('flag')
    expect(loadCountryIcon()).toBe('flag')
    localStorage.setItem('geography-app/country-icon', 'not an icon')
    expect(loadCountryIcon()).toBe('outline')
  })
})
