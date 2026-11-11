import { alternativeNames, type CountryFacts } from '../../shared/countryFacts'
import { normalize } from '../../shared/normalize'

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
  return acceptedNames.some((name) => normalize(name) === normalize(typed))
}
