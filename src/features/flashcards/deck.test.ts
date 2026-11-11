import { State } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { chooseRandomCountry, QUESTION_IDS, type CountryProgress } from './deck'
import { pickingFamiliarity } from './familiarity'
import type { QuestionProgress } from './fsrs'

const TODAY = '2026-05-10'

// A question answered on `lastReview`, with the given stability.
function answered(lastReview: string, stability: number): QuestionProgress {
  return { stability, difficulty: 5, reps: 1, lapses: 0, state: State.Review, lastReview }
}

// A country with all 5 questions answered alike.
function allAnswered(lastReview: string, stability: number): CountryProgress {
  return {
    globe: answered(lastReview, stability),
    area: answered(lastReview, stability),
    population: answered(lastReview, stability),
    ihdi: answered(lastReview, stability),
    capital: answered(lastReview, stability),
  }
}

describe('chooseRandomCountry', () => {
  // FRA is well known, PER barely, and JPN has nothing answered (weight 1).
  const progress: Record<string, CountryProgress> = {
    FRA: allAnswered(TODAY, 1000),
    PER: allAnswered('2026-04-01', 1),
  }
  const codes = ['FRA', 'PER', 'JPN']

  it('picks by 1 − familiarity, walking along the weights', () => {
    const weights = codes.map((code) => 1 - pickingFamiliarity(progress[code], QUESTION_IDS, TODAY))
    const total = weights[0] + weights[1] + weights[2]
    // Just inside each country's share of the total.
    const pickAt = (share: number) =>
      chooseRandomCountry(codes, progress, TODAY, QUESTION_IDS, () => share / total)
    expect(pickAt(weights[0] * 0.5)).toBe('FRA')
    expect(pickAt(weights[0] + weights[1] * 0.5)).toBe('PER')
    expect(pickAt(weights[0] + weights[1] + weights[2] * 0.5)).toBe('JPN')
  })

  it('picks less familiar countries more often', () => {
    const counts: Record<string, number> = { FRA: 0, PER: 0, JPN: 0 }
    for (let i = 0; i < 1000; i++) {
      const random = () => i / 1000
      counts[chooseRandomCountry(codes, progress, TODAY, QUESTION_IDS, random)!]++
    }
    expect(counts.PER).toBeGreaterThan(counts.FRA)
    expect(counts.JPN).toBeGreaterThan(counts.FRA)
  })

  it('only counts the questions being practiced', () => {
    // PER's capital is well known and its area unanswered; FRA's the other way.
    const mixed = {
      FRA: { area: answered(TODAY, 1000) },
      PER: { capital: answered(TODAY, 1000) },
    }
    // Practicing areas, FRA's weight is almost 0 and PER's 1, so a point
    // halfway along the total lands on PER.
    expect(chooseRandomCountry(['FRA', 'PER'], mixed, TODAY, ['area'], () => 0.5)).toBe('PER')
  })

  it('picks evenly when every country is perfectly familiar', () => {
    // With a huge stability, ts-fsrs rounds the chance of remembering to
    // exactly 1, so every weight is 0.
    const known = { FRA: allAnswered(TODAY, 1e12), PER: allAnswered(TODAY, 1e12) }
    expect(chooseRandomCountry(['FRA', 'PER'], known, TODAY, QUESTION_IDS, () => 0.9)).toBe('PER')
  })

  it('returns null when there are no countries', () => {
    expect(chooseRandomCountry([], progress, TODAY, QUESTION_IDS)).toBeNull()
  })
})
