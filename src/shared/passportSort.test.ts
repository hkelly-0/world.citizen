import { afterEach, describe, expect, it } from 'vitest'
import { loadPassportSort, savePassportSort } from './passportSort'

describe('passport sort storage', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('is familiarity when nothing is saved', () => {
    expect(loadPassportSort()).toBe('recall')
  })

  it('loads what was saved', () => {
    savePassportSort('date-discovered')
    expect(loadPassportSort()).toBe('date-discovered')
  })

  it('is familiarity when the saved value is unknown', () => {
    localStorage.setItem('geography-app/passport-sort', 'size')
    expect(loadPassportSort()).toBe('recall')
  })
})
