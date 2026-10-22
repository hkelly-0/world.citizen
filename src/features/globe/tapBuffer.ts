// Very small countries (Vatican, Tuvalu, Nauru...) are only a few pixels wide
// on the globe, so they are nearly impossible to tap. A tap within a few pixels
// of one counts as a tap on it, even if it lands on a bigger neighbour.

// Countries with a total area below this get the tap buffer.
export const VERY_SMALL_AREA_KM2 = 1000

// How far from a very small country, in screen pixels, a tap still counts as
// on it. Pixels rather than kilometres, so it feels the same at every zoom.
export const TAP_BUFFER_PX = 20

// Decides which country a tap picked. `exactIndex` is the country under the
// finger (null for ocean); `nearbyIndices` are the countries within
// TAP_BUFFER_PX of it. Indices are positions in COUNTRY_SHAPES.
// A very small country wins over whatever is under the finger; if several are
// nearby, the one directly under the finger wins, otherwise the first found.
export function chooseTappedIndex(
  exactIndex: number | null,
  nearbyIndices: number[],
  verySmallIndices: Set<number>,
): number | null {
  if (exactIndex !== null && verySmallIndices.has(exactIndex)) return exactIndex
  const nearbyVerySmall = nearbyIndices.find((index) => verySmallIndices.has(index))
  return nearbyVerySmall ?? exactIndex
}
