// A copy of `items` in a random order. `random` is a parameter so tests can
// make the order predictable.
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const remaining = [...items]
  const result: T[] = []
  while (remaining.length > 0) {
    const index = Math.floor(random() * remaining.length)
    result.push(remaining.splice(index, 1)[0])
  }
  return result
}
