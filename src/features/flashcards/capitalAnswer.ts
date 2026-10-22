import { normalise } from '../../shared/normalise'

// True if the typed answer matches any one of the country's capitals.
export function isCapitalCorrect(typed: string, capitals: string[]): boolean {
  return capitals.some((capital) => normalise(capital) === normalise(typed))
}
