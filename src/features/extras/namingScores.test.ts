import { beforeEach, describe, expect, it } from 'vitest'
import {
  formatScoreDate,
  loadNamingScores,
  saveNamingScore,
  type NamingScore,
} from './namingScores'

function score(areaId: string, endedAt: number): NamingScore {
  return { areaId, endedAt, namedCount: 3, countryCount: 44, elapsedMs: null, hintCount: 0 }
}

describe('namingScores', () => {
  beforeEach(() => localStorage.clear())

  it('loads only the chosen area, most recent first', () => {
    saveNamingScore(score('europe', 1000))
    saveNamingScore(score('asia', 2000))
    saveNamingScore(score('europe', 3000))

    expect(loadNamingScores('europe')).toEqual([score('europe', 3000), score('europe', 1000)])
    expect(loadNamingScores('africa')).toEqual([])
  })

  it('loads nothing from unreadable storage', () => {
    localStorage.setItem('geography-app/naming-scores', '{not json')
    expect(loadNamingScores('europe')).toEqual([])
  })

  it('formats the date as day, short month, and year', () => {
    expect(formatScoreDate(new Date(2026, 10, 22, 14, 5).getTime())).toBe('22 Nov 2026')
    expect(formatScoreDate(new Date(2027, 0, 3).getTime())).toBe('3 Jan 2027')
  })
})
