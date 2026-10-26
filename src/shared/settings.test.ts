import { afterEach, describe, expect, it } from 'vitest'
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

  it('shows outlines until another country icon is saved', () => {
    expect(loadCountryIcon()).toBe('outline')
    saveCountryIcon('flag')
    expect(loadCountryIcon()).toBe('flag')
    localStorage.setItem('geography-app/country-icon', 'not an icon')
    expect(loadCountryIcon()).toBe('outline')
  })
})
