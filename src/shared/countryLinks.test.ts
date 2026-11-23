import { describe, expect, it } from 'vitest'
import { linkedCountryCodes, linkedTextParts, withoutLinks } from './countryLinks'

describe('linkedTextParts', () => {
  it('splits a text into plain text and links, keeping the shown text as written', () => {
    expect(linkedTextParts("[The US]{USA} is [Israel]{ISR}'s closest ally.")).toEqual([
      { isoAlpha3: 'USA', name: 'The US' },
      { text: ' is ' },
      { isoAlpha3: 'ISR', name: 'Israel' },
      { text: "'s closest ally." },
    ])
  })

  it('gives a text with no links as one piece', () => {
    expect(linkedTextParts('No links here.')).toEqual([{ text: 'No links here.' }])
  })
})

describe('withoutLinks', () => {
  it('replaces each link with its shown text', () => {
    expect(withoutLinks("Allied with [the US]{USA} and [Japan]{JPN}'s navy.")).toBe(
      "Allied with the US and Japan's navy.",
    )
  })
})

describe('linkedCountryCodes', () => {
  it('lists the linked codes in order, repeats included', () => {
    expect(linkedCountryCodes('[A]{USA}, [B]{JPN}, and [C]{USA}')).toEqual(['USA', 'JPN', 'USA'])
  })
})
