import { describe, expect, it } from 'vitest'
import { countriesWithInfo, loadCountryInfo, parseCountryInfo } from './countryInfo'
import { countryFacts } from './countryFacts'

describe('country info files', () => {
  // Countries without a file are skipped until all 195 are written.
  it('are only for the 195 countries', () => {
    for (const code of countriesWithInfo()) {
      expect(countryFacts[code], code).toBeDefined()
    }
  })

  it('each have the four headings in order, with no empty section', async () => {
    for (const code of countriesWithInfo()) {
      await expect(loadCountryInfo(code), code).resolves.toBeDefined()
    }
  })
})

describe('loadCountryInfo', () => {
  it("loads a country's paragraphs", async () => {
    const info = await loadCountryInfo('CAN')
    expect(info?.economy).toMatch(/^Canada has an advanced economy/)
  })

  it('gives undefined for a country with no file', async () => {
    expect(await loadCountryInfo('XXX')).toBeUndefined()
  })
})

describe('parseCountryInfo', () => {
  const valid = [
    '## History',
    'Old.',
    '## People',
    'Many.',
    '## Economy',
    'Rich.  \t',
    '## International Relations',
    '',
    'Friendly.',
    '',
  ].join('\n')

  it('splits a file into its sections, trimming surrounding whitespace', () => {
    expect(parseCountryInfo(valid)).toEqual({
      history: 'Old.',
      people: 'Many.',
      economy: 'Rich.',
      internationalRelations: 'Friendly.',
    })
  })

  it('rejects a missing, misspelt or reordered heading', () => {
    expect(() => parseCountryInfo(valid.replace('## Economy\nRich.', ''))).toThrow()
    expect(() => parseCountryInfo(valid.replace('## People', '## Peoples'))).toThrow()
    expect(() =>
      parseCountryInfo(
        valid.replace('## History\nOld.\n## People\nMany.', '## People\nMany.\n## History\nOld.'),
      ),
    ).toThrow()
  })

  it('rejects an empty section or text before the first heading', () => {
    expect(() => parseCountryInfo(valid.replace('Many.', ' '))).toThrow()
    expect(() => parseCountryInfo('Intro.\n' + valid)).toThrow()
  })
})
