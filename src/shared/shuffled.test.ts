import { describe, expect, it } from 'vitest'
import { shuffled } from './shuffled'

describe('shuffled', () => {
  it('keeps every item, in an order chosen by `random`', () => {
    expect(shuffled(['a', 'b', 'c'], () => 0)).toEqual(['a', 'b', 'c'])
    expect(shuffled(['a', 'b', 'c'], () => 0.99)).toEqual(['c', 'b', 'a'])
  })
})
