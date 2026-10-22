import { alternativeNames, type CountryFacts } from '../../shared/countryFacts'
import { normalise } from '../../shared/normalise'

// True if the typed answer matches the country's common name, official name,
// or one of its hand-written alternatives (e.g. "Turkey" for Türkiye).
export function isCountryNameCorrect(typed: string, country: CountryFacts): boolean {
  const acceptedNames = [
    country.commonName,
    country.officialName,
    ...alternativeNames(country.isoAlpha3),
  ]
  return acceptedNames.some((name) => normalise(name) === normalise(typed))
}
