import { beforeEach, describe, expect, it } from 'vitest'
import { loadNamingAreaChoice, saveNamingAreaChoice } from './namingAreaChoice'

describe('namingAreaChoice', () => {
  beforeEach(() => localStorage.clear())

  it('loads The World when nothing is saved', () => {
    expect(loadNamingAreaChoice()).toBe('world')
  })

  it('loads the saved area', () => {
    saveNamingAreaChoice('europe')
    expect(loadNamingAreaChoice()).toBe('europe')
  })

  it('loads The World for an area no longer offered', () => {
    saveNamingAreaChoice('atlantis')
    expect(loadNamingAreaChoice()).toBe('world')
  })
})
