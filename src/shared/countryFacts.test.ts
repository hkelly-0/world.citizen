import { describe, expect, it } from 'vitest'
import type { CountryShape } from './countries'
import { countryDisplayName, countryFacts } from './countryFacts'

describe('countryFacts', () => {
  const countries = Object.values(countryFacts)

  it('has the 193 UN members plus the 2 observer states', () => {
    expect(countries.length).toBe(195)
    expect(countryFacts['VAT']?.commonName).toBe('Vatican City')
    expect(countryFacts['PSE']?.commonName).toBe('Palestine')
  })

  it('keys every country by its own ISO alpha-3 code', () => {
    for (const [code, country] of Object.entries(countryFacts)) {
      expect(country.isoAlpha3).toBe(code)
      expect(code).toMatch(/^[A-Z]{3}$/)
    }
  })

  it('gives every country names and at least one capital', () => {
    for (const country of countries) {
      expect(country.commonName).not.toBe('')
      expect(country.officialName).not.toBe('')
      expect(country.capitals.length).toBeGreaterThan(0)
    }
  })

  it('gives every country a positive area and population', () => {
    for (const country of countries) {
      expect(country.areaKm2).toBeGreaterThan(0)
      expect(country.population).toBeGreaterThan(0)
    }
  })

  it('keeps IHDI between 0 and 1, with a year whenever there is a value', () => {
    for (const country of countries) {
      if (country.ihdi === null) {
        expect(country.ihdiYear).toBeNull()
      } else {
        expect(country.ihdi).toBeGreaterThan(0)
        expect(country.ihdi).toBeLessThan(1)
        expect(country.ihdiYear).not.toBeNull()
      }
    }
  })

  it('has an IHDI estimate exactly for countries with an HDI but no IHDI', () => {
    for (const country of countries) {
      const needsEstimate = country.hdi !== null && country.ihdi === null
      expect(country.ihdiEstimate !== null).toBe(needsEstimate)
      if (country.ihdiEstimate !== null) {
        expect(country.ihdiEstimate).toBeGreaterThan(0)
        expect(country.ihdiEstimate).toBeLessThan(country.hdi!)
      }
    }
  })

  it('lists several capitals for countries that have them', () => {
    expect(countryFacts['ZAF']?.capitals).toEqual(['Pretoria', 'Bloemfontein', 'Cape Town'])
    expect(countryFacts['BOL']?.capitals).toEqual(['Sucre', 'La Paz'])
  })
})

describe('countryDisplayName', () => {
  function shape(name: string, isoAlpha3: string | null): CountryShape {
    return { name, isoNumeric: null, isoAlpha3, geometry: { type: 'Point', coordinates: [0, 0] } }
  }

  it("uses our common name for the 195 countries, not the map data's name", () => {
    expect(countryDisplayName(shape('Vatican', 'VAT'))).toBe('Vatican City')
  })

  it("falls back to the map data's name for other areas", () => {
    expect(countryDisplayName(shape('Kosovo', null))).toBe('Kosovo')
    expect(countryDisplayName(shape('Greenland', 'GRL'))).toBe('Greenland')
  })
})
