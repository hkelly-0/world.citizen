import { describe, expect, it } from 'vitest'
import flagSimilarityJson from '../../data/flagSimilarity.json'
import {
  FLAG_HEIGHT,
  FLAG_WIDTH,
  distanceParts,
  flagFeatures,
  flagSimilarity,
  rgbToLab,
} from './flagSimilarity'

type Rgb = [number, number, number]

const RED: Rgb = [206, 17, 38]
const WHITE: Rgb = [255, 255, 255]
const BLUE: Rgb = [0, 56, 168]
const GREEN: Rgb = [0, 154, 68]
const YELLOW: Rgb = [252, 209, 22]
const BLACK: Rgb = [0, 0, 0]

// RGBA pixels of a made-up flag, coloured by `colourAt` for each pixel.
function drawFlag(colourAt: (x: number, y: number) => Rgb): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(FLAG_WIDTH * FLAG_HEIGHT * 4)
  for (let y = 0; y < FLAG_HEIGHT; y++) {
    for (let x = 0; x < FLAG_WIDTH; x++) {
      rgba.set([...colourAt(x, y), 255], 4 * (y * FLAG_WIDTH + x))
    }
  }
  return rgba
}

// Three equal stripes, side by side (like France) or stacked (like Russia).
function tricolour(direction: 'vertical' | 'horizontal', colours: [Rgb, Rgb, Rgb]) {
  return flagFeatures(
    drawFlag((x, y) => {
      const stripe =
        direction === 'vertical'
          ? Math.floor((x * 3) / FLAG_WIDTH)
          : Math.floor((y * 3) / FLAG_HEIGHT)
      return colours[stripe]
    }),
  )
}

// Two stacked stripes, `top` above `bottom`, split `splitRow` rows down.
function bicolour(top: Rgb, bottom: Rgb, splitRow = FLAG_HEIGHT / 2) {
  return flagFeatures(drawFlag((_x, y) => (y < splitRow ? top : bottom)))
}

const savedSimilarity: Record<string, Record<string, number>> = flagSimilarityJson

describe('rgbToLab', () => {
  it('converts white, black and red to their CIELAB values', () => {
    const expectLab = (lab: number[], expected: number[]) =>
      lab.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 0))
    expectLab(rgbToLab(255, 255, 255), [100, 0, 0])
    expectLab(rgbToLab(0, 0, 0), [0, 0, 0])
    expectLab(rgbToLab(255, 0, 0), [53.2, 80.1, 67.2])
  })
})

describe('distanceParts', () => {
  it('finds no distance between a flag and itself', () => {
    const flag = tricolour('vertical', [BLUE, WHITE, RED])
    expect(distanceParts(flag, flag)).toEqual({ layout: 0, palette: 0, edges: 0 })
  })

  it('compares the palette whatever the layout', () => {
    const parts = distanceParts(
      tricolour('vertical', [BLUE, WHITE, RED]),
      tricolour('horizontal', [BLUE, WHITE, RED]),
    )
    // Not exactly 0, as 40 rows don't split into three equal stripes.
    expect(parts.palette).toBeCloseTo(0, 1)
    expect(parts.layout).toBeGreaterThan(0.3)
    expect(parts.edges).toBeGreaterThan(0.5)
  })

  it('compares the edges whatever the colours', () => {
    const parts = distanceParts(
      tricolour('vertical', [BLUE, WHITE, RED]),
      tricolour('vertical', [GREEN, YELLOW, BLACK]),
    )
    expect(parts.edges).toBe(0)
    expect(parts.palette).toBeCloseTo(1, 5)
  })

  it('counts a boundary shifted a little as closer than one shifted a lot', () => {
    const flag = bicolour(RED, WHITE)
    const slightlyShifted = distanceParts(flag, bicolour(RED, WHITE, FLAG_HEIGHT / 2 + 2))
    const farShifted = distanceParts(flag, bicolour(RED, WHITE, FLAG_HEIGHT / 2 + 8))
    expect(slightlyShifted.edges).toBeGreaterThan(0)
    expect(slightlyShifted.edges).toBeLessThan(farShifted.edges)
  })
})

describe('flagSimilarity', () => {
  it('finds a flag the same as itself upside down, like Poland and Indonesia', () => {
    expect(flagSimilarity(bicolour(WHITE, RED), bicolour(RED, WHITE))).toBeCloseTo(1, 5)
  })

  it('ranks the same design in other colours below a similar colour layout', () => {
    const flag = tricolour('vertical', [BLUE, WHITE, RED])
    const similarColours = tricolour('vertical', [BLUE, WHITE, GREEN])
    const otherColours = tricolour('vertical', [GREEN, YELLOW, BLACK])
    expect(flagSimilarity(flag, similarColours)).toBeGreaterThan(flagSimilarity(flag, otherColours))
  })

  it('is the same both ways round', () => {
    const a = tricolour('vertical', [BLUE, WHITE, RED])
    const b = bicolour(RED, BLUE, 10)
    expect(flagSimilarity(a, b)).toBeCloseTo(flagSimilarity(b, a), 5)
  })
})

describe('saved flag similarity', () => {
  const codes = Object.keys(savedSimilarity)

  it('lists the closest other countries for each country, most similar first', () => {
    expect(codes).toHaveLength(195)
    for (const code of codes) {
      const matches = Object.keys(savedSimilarity[code])
      const similarities = Object.values(savedSimilarity[code])
      // SIMILAR_FLAGS_KEPT in scripts/make-flag-similarity.mjs.
      expect(matches).toHaveLength(15)
      expect(matches).not.toContain(code)
      for (const match of matches) expect(codes).toContain(match)
      expect(similarities).toEqual([...similarities].sort((a, b) => b - a))
    }
  })

  it('finds near-twins', () => {
    const mostSimilar = (code: string, count: number) =>
      Object.keys(savedSimilarity[code]).slice(0, count)
    expect(mostSimilar('TCD', 1)).toEqual(['ROU'])
    expect(mostSimilar('IDN', 2).sort()).toEqual(['MCO', 'POL'])
    expect(mostSimilar('CIV', 1)).toEqual(['IRL'])
  })
})
