import { describe, expect, it } from 'vitest'
import territorySubtitles from '../data/territorySubtitles.json'
import {
  hasTerritoryInfo,
  loadTerritoryInfo,
  parseTerritoryInfo,
  territoriesWithInfo,
} from './territoryInfo'

describe('territory info files', () => {
  it('are each named by a map area in territorySubtitles.json', () => {
    for (const key of territoriesWithInfo()) {
      expect(Object.keys(territorySubtitles), key).toContain(key)
    }
  })

  it('each have just the Info heading and a paragraph of at most 80 words', async () => {
    for (const key of territoriesWithInfo()) {
      const info = await loadTerritoryInfo(key)
      expect(info, key).toBeDefined()
      expect(info!.split(/\s+/).length, key).toBeLessThanOrEqual(80)
    }
  })
})

describe('loadTerritoryInfo', () => {
  it("loads an area's paragraph, by code or by map name", async () => {
    expect(await loadTerritoryInfo('HKG')).toMatch(/^Hong Kong is/)
    expect(await loadTerritoryInfo('Somaliland')).toMatch(/^Somaliland declared/)
  })

  it('gives undefined for an area with no file', async () => {
    expect(hasTerritoryInfo('GRL')).toBe(false)
    expect(await loadTerritoryInfo('GRL')).toBeUndefined()
  })
})

describe('parseTerritoryInfo', () => {
  it('gives the paragraph, trimming surrounding whitespace', () => {
    expect(parseTerritoryInfo('## Info\n\n  Disputed.  \n')).toBe('Disputed.')
  })

  it('rejects a wrong or extra heading, an empty section, or text before the heading', () => {
    expect(() => parseTerritoryInfo('## History\nOld.')).toThrow()
    expect(() => parseTerritoryInfo('## Info\nOld.\n## People\nMany.')).toThrow()
    expect(() => parseTerritoryInfo('## Info\n  \n')).toThrow()
    expect(() => parseTerritoryInfo('Intro.\n## Info\nOld.')).toThrow()
    expect(() => parseTerritoryInfo('No heading.')).toThrow()
  })
})
