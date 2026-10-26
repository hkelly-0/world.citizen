// How alike two flags look, for scripts/make-flag-similarity.mjs (which saves
// the result to src/data/flagSimilarity.json). Every flag is drawn at
// FLAG_WIDTH x FLAG_HEIGHT, stretched rather than letterboxed (real proportions
// don't matter for looking alike), and compared three ways:
// - layout: how different the colours are pixel by pixel (Chad and Romania);
// - palette: how much of each colour there is, wherever it is (France and the
//   Netherlands);
// - edges: where the colour boundaries are, whatever the colours (the Nordic
//   crosses).
// Each part is a distance from 0 (the same) to 1, and the parts are mixed by
// LAYOUT_WEIGHT, PALETTE_WEIGHT and EDGE_WEIGHT. So the same design in other
// colours only counts a little: two flags with no colour in common are far
// apart on layout and palette (the owner preferred this to also matching
// designs whatever their colours, which made every vertical tricolour tie). A
// flag is also compared with the other one mirrored and upside down, keeping
// the closest, so Poland matches Indonesia.

export const FLAG_WIDTH = 60
export const FLAG_HEIGHT = 40
const PIXEL_COUNT = FLAG_WIDTH * FLAG_HEIGHT

export const LAYOUT_WEIGHT = 0.4
export const PALETTE_WEIGHT = 0.3
export const EDGE_WEIGHT = 0.3

// A mean colour difference (CIE76 ΔE) of this or more counts as completely
// different layouts. For scale: red and white are about 114 apart.
const MAX_LAYOUT_DIFFERENCE = 100

// Neighbouring pixels further apart than this (ΔE) are an edge. Above the
// small differences from anti-aliasing and shading, below two flag colours.
const EDGE_THRESHOLD = 20

// Edges an average of this many pixels or more from the other flag's edges
// count as completely different designs.
const MAX_EDGE_OFFSET = 6

// Typical flag colours. Each pixel is counted as the nearest of these for the
// palette comparison, so slightly different reds or blues count as the same.
const PALETTE_COLOURS: [number, number, number][] = [
  [206, 17, 38], // red
  [141, 27, 61], // maroon
  [255, 130, 0], // orange
  [252, 209, 22], // yellow
  [0, 154, 68], // green
  [117, 170, 219], // light blue
  [0, 56, 168], // blue
  [255, 255, 255], // white
  [0, 0, 0], // black
]

// What a flag is compared by, each with one value per pixel, row by row
// (three for `lab`): its colours in CIELAB (L, a, b); its edge map (1 on an
// edge, else 0); how many pixels each pixel is from the nearest edge; and the
// share of its pixels nearest each of PALETTE_COLOURS.
export type FlagFeatures = {
  lab: Float32Array
  edges: Uint8Array
  edgeDistances: Float32Array
  palette: number[]
}

export type DistanceParts = { layout: number; palette: number; edges: number }

// Converts an sRGB colour (0 to 255 each) to CIELAB, with a D65 white point.
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const toLinear = (channel: number) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  // Linear sRGB to XYZ, each divided by the D65 white's X, Y or Z.
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((t * 24389) / 27 + 16) / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

// The CIE76 colour difference between pixel `i` of `a` and pixel `j` of `b`.
function colourDifference(a: Float32Array, i: number, b: Float32Array, j: number): number {
  const dL = a[3 * i] - b[3 * j]
  const dA = a[3 * i + 1] - b[3 * j + 1]
  const dB = a[3 * i + 2] - b[3 * j + 2]
  return Math.sqrt(dL * dL + dA * dA + dB * dB)
}

// The features of a flag drawn as RGBA pixels at FLAG_WIDTH x FLAG_HEIGHT.
// Transparent pixels (around Nepal's flag) count as white.
export function flagFeatures(rgba: Uint8Array | Uint8ClampedArray): FlagFeatures {
  const lab = new Float32Array(PIXEL_COUNT * 3)
  for (let i = 0; i < PIXEL_COUNT; i++) {
    const alpha = rgba[4 * i + 3] / 255
    const overWhite = (channel: number) => channel * alpha + 255 * (1 - alpha)
    const [l, a, b] = rgbToLab(
      overWhite(rgba[4 * i]),
      overWhite(rgba[4 * i + 1]),
      overWhite(rgba[4 * i + 2]),
    )
    lab[3 * i] = l
    lab[3 * i + 1] = a
    lab[3 * i + 2] = b
  }
  const edges = edgeMap(lab)
  return { lab, edges, edgeDistances: distancesToEdges(edges), palette: paletteShares(lab) }
}

// 1 on both pixels either side of a colour boundary (neighbours further apart
// than EDGE_THRESHOLD), else 0. Marking both sides keeps the edges in place
// when the flag is flipped.
function edgeMap(lab: Float32Array): Uint8Array {
  const edges = new Uint8Array(PIXEL_COUNT)
  for (let y = 0; y < FLAG_HEIGHT; y++) {
    for (let x = 0; x < FLAG_WIDTH; x++) {
      const i = y * FLAG_WIDTH + x
      if (x + 1 < FLAG_WIDTH && colourDifference(lab, i, lab, i + 1) > EDGE_THRESHOLD) {
        edges[i] = 1
        edges[i + 1] = 1
      }
      if (y + 1 < FLAG_HEIGHT && colourDifference(lab, i, lab, i + FLAG_WIDTH) > EDGE_THRESHOLD) {
        edges[i] = 1
        edges[i + FLAG_WIDTH] = 1
      }
    }
  }
  return edges
}

// For each pixel, the straight-line distance in pixels to the nearest edge
// pixel, by checking every edge pixel (fast enough at this size). Infinity
// everywhere if there are no edges.
function distancesToEdges(edges: Uint8Array): Float32Array {
  const edgePixels: [number, number][] = []
  for (let i = 0; i < PIXEL_COUNT; i++) {
    if (edges[i] === 1) edgePixels.push([i % FLAG_WIDTH, Math.floor(i / FLAG_WIDTH)])
  }
  const distances = new Float32Array(PIXEL_COUNT)
  for (let y = 0; y < FLAG_HEIGHT; y++) {
    for (let x = 0; x < FLAG_WIDTH; x++) {
      let nearest = Infinity
      for (const [ex, ey] of edgePixels) {
        nearest = Math.min(nearest, Math.hypot(x - ex, y - ey))
      }
      distances[y * FLAG_WIDTH + x] = nearest
    }
  }
  return distances
}

// The share of pixels nearest each of PALETTE_COLOURS, in the same order.
function paletteShares(lab: Float32Array): number[] {
  const paletteLab = new Float32Array(PALETTE_COLOURS.flatMap(([r, g, b]) => rgbToLab(r, g, b)))
  const shares = PALETTE_COLOURS.map(() => 0)
  for (let i = 0; i < PIXEL_COUNT; i++) {
    let nearest = 0
    for (let p = 1; p < PALETTE_COLOURS.length; p++) {
      if (colourDifference(lab, i, paletteLab, p) < colourDifference(lab, i, paletteLab, nearest)) {
        nearest = p
      }
    }
    shares[nearest] += 1 / PIXEL_COUNT
  }
  return shares
}

// The same flag mirrored left to right, or turned upside down.
export function flipFeatures(
  features: FlagFeatures,
  direction: 'horizontal' | 'vertical',
): FlagFeatures {
  const lab = new Float32Array(PIXEL_COUNT * 3)
  const edges = new Uint8Array(PIXEL_COUNT)
  const edgeDistances = new Float32Array(PIXEL_COUNT)
  for (let y = 0; y < FLAG_HEIGHT; y++) {
    for (let x = 0; x < FLAG_WIDTH; x++) {
      const from =
        direction === 'horizontal'
          ? y * FLAG_WIDTH + (FLAG_WIDTH - 1 - x)
          : (FLAG_HEIGHT - 1 - y) * FLAG_WIDTH + x
      const to = y * FLAG_WIDTH + x
      lab.set(features.lab.subarray(3 * from, 3 * from + 3), 3 * to)
      edges[to] = features.edges[from]
      edgeDistances[to] = features.edgeDistances[from]
    }
  }
  return { lab, edges, edgeDistances, palette: features.palette }
}

// The three distances between two flags as drawn (no flipping).
export function distanceParts(a: FlagFeatures, b: FlagFeatures): DistanceParts {
  let colourSum = 0
  for (let i = 0; i < PIXEL_COUNT; i++) colourSum += colourDifference(a.lab, i, b.lab, i)
  const layout = Math.min(1, colourSum / PIXEL_COUNT / MAX_LAYOUT_DIFFERENCE)

  // Half the total difference in shares: 0 for the same mix, 1 for no colour
  // in common.
  let shareDifference = 0
  for (let p = 0; p < a.palette.length; p++) {
    shareDifference += Math.abs(a.palette[p] - b.palette[p])
  }
  const palette = shareDifference / 2

  // How far each flag's edges are from the other's, on average (chamfer
  // distance): unlike counting overlapping edge pixels, a boundary shifted by
  // a pixel or two counts as only slightly different.
  const edgeOffset = (averageEdgeOffset(a, b) + averageEdgeOffset(b, a)) / 2
  const edges = Math.min(1, edgeOffset / MAX_EDGE_OFFSET)

  return { layout, palette, edges }
}

// The average distance in pixels from each of `from`'s edge pixels to the
// nearest of `to`'s. 0 if `from` has no edges, Infinity if only `to` has none.
function averageEdgeOffset(from: FlagFeatures, to: FlagFeatures): number {
  let sum = 0
  let count = 0
  for (let i = 0; i < PIXEL_COUNT; i++) {
    if (from.edges[i] === 0) continue
    sum += to.edgeDistances[i]
    count++
  }
  return count === 0 ? 0 : sum / count
}

// The parts mixed into one distance, 0 to 1.
export function combinedDistance(parts: DistanceParts): number {
  return LAYOUT_WEIGHT * parts.layout + PALETTE_WEIGHT * parts.palette + EDGE_WEIGHT * parts.edges
}

// How alike two flags look, from 0 (nothing alike) to 1 (the same): one minus
// the smallest combined distance between `a` and `b` as drawn, mirrored or
// upside down. Symmetric, as flipping both flags doesn't change their distance.
export function flagSimilarity(a: FlagFeatures, b: FlagFeatures): number {
  const orientations = [b, flipFeatures(b, 'horizontal'), flipFeatures(b, 'vertical')]
  const distances = orientations.map((flipped) => combinedDistance(distanceParts(a, flipped)))
  return 1 - Math.min(...distances)
}
