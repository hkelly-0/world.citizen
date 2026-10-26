import { describe, expect, it } from 'vitest'
import type { CountryShape } from './countries'
import nameAlternativesJson from '../data/countryNameAlternatives.json'
import territorySubtitlesJson from '../data/territorySubtitles.json'
import { loadCountryShapes } from './countries'
import {
  alternativeNames,
  countryDisplayName,
  countryFacts,
  territorySubtitle,
} from './countryFacts'

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

  it('puts every country in a group of 3 to 5, with one name per group', () => {
    const groupSizes: Record<string, number> = {}
    const groupNames: Record<string, string> = {}
    for (const country of countries) {
      groupSizes[country.groupId] = (groupSizes[country.groupId] ?? 0) + 1
      groupNames[country.groupId] ??= country.groupName
      expect(country.groupName).toBe(groupNames[country.groupId])
    }
    for (const size of Object.values(groupSizes)) {
      expect(size).toBeGreaterThanOrEqual(3)
      expect(size).toBeLessThanOrEqual(5)
    }
    expect(countryFacts['NOR']?.groupName).toBe('Nordic Countries')
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

describe('alternativeNames', () => {
  it("gives a country's other names, or none", () => {
    expect(alternativeNames('TUR')).toEqual(['Turkey'])
    expect(alternativeNames('FRA')).toEqual([])
  })

  it('only lists alternatives for the 195 countries', () => {
    for (const code of Object.keys(nameAlternativesJson)) {
      expect(countryFacts[code]).toBeDefined()
    }
  })
})

describe('territorySubtitle', () => {
  it('has a subtitle for every map area outside the 195 countries, and none for the 195', () => {
    for (const shape of loadCountryShapes()) {
      const isCountry = shape.isoAlpha3 !== null && countryFacts[shape.isoAlpha3] !== undefined
      if (isCountry) expect(territorySubtitle(shape), shape.name).toBeUndefined()
      else expect(territorySubtitle(shape), shape.name).toBeTruthy()
    }
  })

  it('splits a subtitle into text and the countries it names', () => {
    const shape: CountryShape = {
      name: 'North Cyprus',
      isoNumeric: null,
      isoAlpha3: null,
      geometry: { type: 'Polygon', coordinates: [] },
    }
    expect(territorySubtitle(shape)).toEqual([
      { text: 'Self-declared state. Recognised only by ' },
      { isoAlpha3: 'TUR', name: 'Türkiye' },
      { text: ', claimed by ' },
      { isoAlpha3: 'CYP', name: 'Cyprus' },
    ])
  })

  it('names only the 195 countries in subtitles', () => {
    for (const subtitle of Object.values(territorySubtitlesJson)) {
      for (const [, code] of subtitle.matchAll(/\{([A-Z]{3})\}/g)) {
        expect(countryFacts[code], code).toBeDefined()
      }
    }
  })
})
