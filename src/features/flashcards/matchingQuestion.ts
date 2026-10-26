// Shared by the matching questions (Flag Matching and Capital Matching), where
// labels are put on targets: names on flags, or capitals on countries.

// How many targets (and labels) each matching question shows.
export const MATCHING_COUNT = 4

// The label on each target: `placed[i]` is the country code whose label is on
// the i-th target shown, or null if that target has no label on it yet.
export type MatchingPlacements = (string | null)[]

// The placements after the label `labelCode` is put on target `targetIndex`,
// or taken off every target when `targetIndex` is null. A label already on
// that target is swapped onto the target `labelCode` came from, or taken off
// if `labelCode` wasn't on a target.
export function placeLabel(
  placed: MatchingPlacements,
  labelCode: string,
  targetIndex: number | null,
): MatchingPlacements {
  const fromIndex = placed.indexOf(labelCode)
  const result = [...placed]
  if (targetIndex === null) {
    if (fromIndex !== -1) result[fromIndex] = null
    return result
  }
  const displaced = result[targetIndex]
  if (fromIndex !== -1) result[fromIndex] = displaced
  result[targetIndex] = labelCode
  return result
}
