import type { Feature, Geometry, LineString, Position } from 'geojson'

// Borders drawn dashed on the globe, as pairs of map names (CountryShape's
// name): lines in dispute, or where one side's independence is.
export const DISPUTED_BORDERS: [string, string][] = [
  // Morocco claims all of Western Sahara; the Sahrawi Republic claims it too.
  ['Morocco', 'Western Sahara'],
  // Part of China, with a (now outlawed) independence movement. Macao, with
  // none, keeps a solid border.
  ['Hong Kong', 'China'],
  // Only the line with Somalia: Ethiopia and Djibouti's are the old
  // international borders.
  ['Somaliland', 'Somalia'],
  // The Green Line; only Turkey recognizes North Cyprus.
  ['North Cyprus', 'Cyprus'],
  // Serbia doesn't recognize Kosovo.
  ['Kosovo', 'Serbia'],
  // Held by India and claimed by Pakistan; India also claims the side held by
  // China. So its whole outline is dashed.
  ['Siachen Glacier', 'India'],
  ['Siachen Glacier', 'Pakistan'],
  ['Siachen Glacier', 'China'],
]

// The map names of every shape with a disputed border. Their outlines are
// drawn by borderLineFeatures instead of the polygon outlines.
export const SHAPES_WITH_DISPUTED_BORDERS = new Set(DISPUTED_BORDERS.flat())

type NamedGeometry = { name: string; geometry: Geometry }

// A line from `from` to `to` as a key that is the same whichever way round it
// is drawn. Neighbouring outlines share exactly the same points along their
// border (TopoJSON stores it once), so this finds shared edges.
function edgeKey(from: Position, to: Position): string {
  const a = from.join(',')
  const b = to.join(',')
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function ringsOf(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  throw new Error(`Unexpected geometry type ${geometry.type}`)
}

function edgeKeysOf(geometry: Geometry): Set<string> {
  const keys = new Set<string>()
  for (const ring of ringsOf(geometry)) {
    for (let i = 1; i < ring.length; i++) keys.add(edgeKey(ring[i - 1], ring[i]))
  }
  return keys
}

// How one edge of an outline is drawn. A disputed border is in both
// neighbours' outlines, but is drawn once, from the pair's first shape: two
// dashed copies drawn from opposite ends would fill each other's gaps.
type EdgeKind = 'solid' | 'dashed' | 'skipped'

// The outlines of the shapes in `pairs` (DISPUTED_BORDERS on the globe), as
// lines with a "disputed" property: true for dashed runs of edges, false for
// solid ones. Solid borders between two of these shapes are drawn from both
// sides, like every other border in the polygon outlines.
export function borderLineFeatures(
  shapes: NamedGeometry[],
  pairs: [string, string][],
): Feature<LineString>[] {
  const geometryByName = new Map(shapes.map((shape) => [shape.name, shape.geometry]))
  const geometryOf = (name: string) => {
    const geometry = geometryByName.get(name)
    if (geometry === undefined) throw new Error(`No shape called ${name}`)
    return geometry
  }

  const features: Feature<LineString>[] = []
  for (const name of new Set(pairs.flat())) {
    // The edges this shape shares with each of its partners in a pair, and
    // whether it is that pair's first shape.
    const partners = pairs.flatMap(([first, second]) => {
      if (first === name) return [{ edges: edgeKeysOf(geometryOf(second)), isFirst: true }]
      if (second === name) return [{ edges: edgeKeysOf(geometryOf(first)), isFirst: false }]
      return []
    })
    const kindOf = (from: Position, to: Position): EdgeKind => {
      const key = edgeKey(from, to)
      const partner = partners.find(({ edges }) => edges.has(key))
      if (partner === undefined) return 'solid'
      return partner.isFirst ? 'dashed' : 'skipped'
    }

    for (const ring of ringsOf(geometryOf(name))) {
      // A closed ring repeats its first point at the end, so edge i runs from
      // point i to point i + 1.
      const edgeCount = ring.length - 1
      const kinds = Array.from({ length: edgeCount }, (_, i) => kindOf(ring[i], ring[i + 1]))
      // Start where the kind changes, so a run isn't split where the ring
      // happens to start (which would restart its dashes).
      const changeAt = kinds.findIndex((kind, i) => kind !== kinds[(i + edgeCount - 1) % edgeCount])
      const start = changeAt === -1 ? 0 : changeAt

      let runKind = kinds[start]
      let runPoints: Position[] = [ring[start]]
      const endRun = () => {
        if (runKind !== 'skipped') {
          features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: runPoints },
            properties: { disputed: runKind === 'dashed' },
          })
        }
      }
      for (let step = 0; step < edgeCount; step++) {
        const i = (start + step) % edgeCount
        if (kinds[i] !== runKind) {
          endRun()
          runKind = kinds[i]
          runPoints = [ring[i]]
        }
        runPoints.push(ring[i + 1])
      }
      endRun()
    }
  }
  return features
}
