import { afterEach, describe, expect, it } from 'vitest'
import { loadDiscoveries, recordDiscovery } from './discoveries'

describe('discovery times', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('starts empty when nothing is saved', () => {
    expect(loadDiscoveries()).toEqual({})
  })

  it('keeps the first time a country is recorded', () => {
    recordDiscovery('FRA', new Date('2026-10-20T09:00:00Z'))
    recordDiscovery('FRA', new Date('2026-10-22T09:00:00Z'))
    recordDiscovery('PER', new Date('2026-10-21T09:00:00Z'))
    expect(loadDiscoveries()).toEqual({
      FRA: '2026-10-20T09:00:00.000Z',
      PER: '2026-10-21T09:00:00.000Z',
    })
  })

  it('starts empty when the saved data is unreadable', () => {
    localStorage.setItem('geography-app/discovered-at', 'not json')
    expect(loadDiscoveries()).toEqual({})
  })
})
