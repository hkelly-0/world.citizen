import { describe, expect, it } from 'vitest'
import { QUESTION_IDS } from '../flashcards/deck'
import { homeCardNotes } from './tutorialNotes'

describe('homeCardNotes', () => {
  it('explains named ranges and info questions only on the first of each asked', () => {
    const notes = homeCardNotes(QUESTION_IDS)

    expect(notes.area).toMatch(/named ranges/)
    expect(notes.population).toBe('Pick the named range again.')
    expect(notes.ihdi).not.toMatch(/named ranges/)
    expect(notes.history).toMatch(/reveal the paragraph/)
    expect(notes.people).toBeUndefined()
  })

  it('moves those explanations to the first question asked when earlier ones are left out', () => {
    const notes = homeCardNotes(['ihdi', 'economy', 'internationalRelations'])

    expect(notes.area).toBeUndefined()
    expect(notes.ihdi).toMatch(/Inequality-adjusted.*named ranges/)
    expect(notes.economy).toMatch(/reveal the paragraph/)
    expect(notes.internationalRelations).toBeUndefined()
  })
})
