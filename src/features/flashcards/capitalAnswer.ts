import { nativeCapitalNames, type CountryFacts } from '../../shared/countryFacts'
import { normalize } from '../../shared/normalize'

// True if the typed answer matches any one of the country's capitals, in
// English or in the country's own language (e.g. "Warszawa" for Warsaw).
export function isCapitalCorrect(typed: string, country: CountryFacts): boolean {
  const acceptedNames = [...country.capitals, ...nativeCapitalNames(country.isoAlpha3)]
  return acceptedNames.some((capital) => normalize(capital) === normalize(typed))
}
