import { alternativeNames, type CountryFacts } from '../../shared/countryFacts'
import { normalise } from '../../shared/normalise'

// True if the typed answer matches the country's common name, official name,
// one of its hand-written alternatives (e.g. "Turkey" for Türkiye), or one of
// its native names (e.g. "Italia").
export function isCountryNameCorrect(typed: string, country: CountryFacts): boolean {
  const acceptedNames = [
    country.commonName,
    country.officialName,
    ...alternativeNames(country.isoAlpha3),
    ...country.nativeNames,
  ]
  return acceptedNames.some((name) => normalise(name) === normalise(typed))
}
