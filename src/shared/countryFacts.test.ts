import { describe, expect, it } from 'vitest'
import type { CountryShape } from './countries'
import capitalNativeNamesJson from '../data/capitalNativeNames.json'
import nameAlternativesJson from '../data/countryNameAlternatives.json'
import territorySubtitlesJson from '../data/territorySubtitles.json'
import { loadCountryShapes } from './countries'
import {
  alternativeNames,
  compareNames,
  countryDisplayName,
  countryFacts,
  nativeCapitalNames,
  territoryFigures,
  territorySubtitle,
} from './countryFacts'

describe('countryFacts', () => {
  const countries = Object.values(countryFacts)

  it('has the 193 UN members plus the 2 observer states, Taiwan, and Kosovo', () => {
    expect(countries.length).toBe(197)
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

  it('has an IHDI breakdown exactly for countries with an IHDI, whose geometric mean is the IHDI', () => {
    for (const country of countries) {
      expect(country.ihdiBreakdown !== null).toBe(country.ihdi !== null)
      if (country.ihdiBreakdown !== null) {
        const { lifespan, education, income } = country.ihdiBreakdown
        // The parts are rounded to 3 decimals, so allow a little more than UNDP's rounding.
        expect(Math.cbrt(lifespan * education * income)).toBeCloseTo(country.ihdi!, 2)
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

  it('puts every country in a group of 3 to 6, with one name per group', () => {
    const groupSizes: Record<string, number> = {}
    const groupNames: Record<string, string> = {}
    for (const country of countries) {
      groupSizes[country.groupId] = (groupSizes[country.groupId] ?? 0) + 1
      groupNames[country.groupId] ??= country.groupName
      expect(country.groupName).toBe(groupNames[country.groupId])
    }
    for (const size of Object.values(groupSizes)) {
      expect(size).toBeGreaterThanOrEqual(3)
      expect(size).toBeLessThanOrEqual(6)
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
    return {
      name,
      isoNumeric: null,
      isoAlpha3,
      partOf: null,
      geometry: { type: 'Point', coordinates: [0, 0] },
    }
  }

  it("uses our common name for the 197 countries, not the map data's name", () => {
    expect(countryDisplayName(shape('Vatican', 'VAT'))).toBe('Vatican City')
  })

  it("falls back to the map data's name for other areas", () => {
    expect(countryDisplayName(shape('Kosovo', null))).toBe('Kosovo')
    expect(countryDisplayName(shape('Greenland', 'GRL'))).toBe('Greenland')
  })
})

describe('compareNames', () => {
  it('sorts A–Z ignoring a leading "The"', () => {
    const names = ['Thailand', 'The Gambia', 'Germany', 'The Bahamas', 'Bahrain']
    expect(names.sort(compareNames)).toEqual([
      'The Bahamas',
      'Bahrain',
      'The Gambia',
      'Germany',
      'Thailand',
    ])
  })
})

describe('alternativeNames', () => {
  it("gives a country's other names, or none", () => {
    expect(alternativeNames('TUR')).toEqual(['Turkey'])
    expect(alternativeNames('FRA')).toEqual([])
  })

  it('only lists alternatives for the 197 countries', () => {
    for (const code of Object.keys(nameAlternativesJson)) {
      expect(countryFacts[code]).toBeDefined()
    }
  })
})

describe('nativeCapitalNames', () => {
  it("gives a country's native capital names, or none", () => {
    expect(nativeCapitalNames('POL')).toEqual(['Warszawa'])
    expect(nativeCapitalNames('FRA')).toEqual([])
  })

  it('only lists native capital names for the 197 countries', () => {
    for (const code of Object.keys(capitalNativeNamesJson)) {
      expect(countryFacts[code]).toBeDefined()
    }
  })
})

describe('territorySubtitle', () => {
  it('has a subtitle for every map area outside the 197 countries, and none for the 197', () => {
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
      partOf: null,
      geometry: { type: 'Polygon', coordinates: [] },
    }
    expect(territorySubtitle(shape)).toEqual([
      { text: 'Self-declared state. Recognized only by ' },
      { isoAlpha3: 'TUR', name: 'Türkiye' },
      { text: ', claimed by ' },
      { isoAlpha3: 'CYP', name: 'Cyprus' },
    ])
  })

  it('names only the 197 countries in subtitles', () => {
    for (const subtitle of Object.values(territorySubtitlesJson)) {
      for (const [, code] of subtitle.matchAll(/\{([A-Z]{3})\}/g)) {
        expect(countryFacts[code], code).toBeDefined()
      }
    }
  })
})

describe('territoryFigures', () => {
  it('has figures for every map area outside the 197 countries, and none for the 197', () => {
    for (const shape of loadCountryShapes()) {
      const isCountry = shape.isoAlpha3 !== null && countryFacts[shape.isoAlpha3] !== undefined
      if (isCountry) expect(territoryFigures(shape), shape.name).toBeUndefined()
      else expect(territoryFigures(shape), shape.name).toBeDefined()
    }
  })

  it('gives every map area a positive area, and a positive population or none', () => {
    for (const shape of loadCountryShapes()) {
      const figures = territoryFigures(shape)
      if (figures === undefined) continue
      expect(figures.areaKm2, shape.name).toBeGreaterThan(0)
      if (figures.population !== null) expect(figures.population, shape.name).toBeGreaterThan(0)
    }
  })
})
