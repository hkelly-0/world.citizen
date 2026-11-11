import type { ReactNode, Ref } from 'react'
import type { CountryShape } from '../../shared/countries'
import {
  countryDisplayName,
  countryFacts,
  territoryFigures,
  territorySubtitle,
} from '../../shared/countryFacts'
import { flagImageSrc } from '../../shared/flags'
import { INFO_QUESTION_IDS, type QuestionId } from '../flashcards/deck'
import { RangeTitle } from '../../shared/RangeTitle'
import {
  areaStat,
  ihdiStat,
  NO_DATA,
  populationStat,
  type RangeLabel,
  type StatValue,
} from '../../shared/statRanges'
import { CountryInfoSections } from './CountryInfoSections'
import { IhdiBreakdownButton } from '../../shared/IhdiBreakdownButton'
import './CountryInfoPanel.css'

type CountryInfoPanelProps = {
  // Only the name and code are used, so the Passport can pass just those.
  country: Pick<CountryShape, 'name' | 'isoAlpha3'>
  // The question types whose facts are shown: those chosen in Settings on the
  // Passport card, all of them on the globe. (Names are always shown, and
  // 'globe' has no fact here.)
  learnedQuestionIds: QuestionId[]
  onClose: () => void
  // Called with a country's ISO alpha-3 code when its name in a territory's
  // subtitle is clicked, to select that country instead. Only the globe shows
  // territories, so only it passes this.
  onSelectCountry?: (isoAlpha3: string) => void
  // Whether to show the paragraphs about the country (History, People, etc.)
  // below the facts, those in learnedQuestionIds. Only the globe shows them.
  showCountryInfo?: boolean
  // Lets the globe measure the panel, to centre a country in the space above it.
  ref?: Ref<HTMLElement>
}

// The range's name with the country's rounded value in place of the bound,
// e.g. "45M  Moderate". With no data (null), only "No data" is shown, without
// `afterBound` (e.g. the IHDI breakdown's "?").
function RangeWithValue({ stat, afterBound }: { stat: StatValue | null; afterBound?: ReactNode }) {
  if (stat === null) return <RangeTitle range={NO_DATA} />
  return <RangeTitle range={{ bound: stat.value, name: stat.range.name }} afterBound={afterBound} />
}

// Shown instead of a population for map areas where nobody lives permanently
// (e.g. Antarctica). It isn't a range.
const NO_PERMANENT_POPULATION: RangeLabel = { bound: null, name: 'No permanent population' }

export function CountryInfoPanel({
  country,
  learnedQuestionIds,
  onClose,
  onSelectCountry,
  showCountryInfo = false,
  ref,
}: CountryInfoPanelProps) {
  // Facts exist only for the 197 countries; other map areas (e.g. Greenland,
  // Somaliland) have none, either because they have no ISO code or aren't included.
  const facts = country.isoAlpha3 === null ? undefined : countryFacts[country.isoAlpha3]
  const name = countryDisplayName(country)
  const subtitle = territorySubtitle(country)
  // Area and population for map areas outside the 197 (e.g. Greenland).
  const figures = territoryFigures(country)

  return (
    <aside ref={ref} className="country-info-panel" aria-label={`${name} details`}>
      <button className="country-info-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{name}</h2>
      {facts === undefined ? (
        <>
          <p className="country-info-panel__note">
            {subtitle === undefined
              ? 'Not one of the 197 countries in this app.'
              : subtitle.map((part, i) =>
                  'text' in part ? (
                    part.text
                  ) : (
                    <button
                      key={i}
                      className="country-info-panel__country-link"
                      onClick={() => onSelectCountry?.(part.isoAlpha3)}
                    >
                      {part.name}
                    </button>
                  ),
                )}
          </p>
          {/* Shown like a country's, against the same ranges. */}
          {figures !== undefined && (
            <dl>
              {learnedQuestionIds.includes('area') && (
                <>
                  <dt>Area</dt>
                  <dd>
                    <RangeWithValue stat={areaStat(figures)} />
                  </dd>
                </>
              )}
              {learnedQuestionIds.includes('population') && (
                <>
                  <dt>Population</dt>
                  <dd>
                    {figures.population === null ? (
                      <RangeTitle range={NO_PERMANENT_POPULATION} />
                    ) : (
                      <RangeWithValue stat={populationStat({ population: figures.population })} />
                    )}
                  </dd>
                </>
              )}
            </dl>
          )}
        </>
      ) : (
        <>
          {/* Skip the official name when it's the same, e.g. "Japan". */}
          {facts.officialName !== facts.commonName && (
            <p className="country-info-panel__official-name">{facts.officialName}</p>
          )}
          {learnedQuestionIds.includes('flag') && (
            <img
              className="country-info-panel__flag"
              src={flagImageSrc(facts.isoAlpha3)}
              alt={`Flag of ${facts.commonName}`}
            />
          )}
          <dl>
            {learnedQuestionIds.includes('area') && (
              <>
                <dt>Area</dt>
                <dd>
                  <RangeWithValue stat={areaStat(facts)} />
                </dd>
              </>
            )}
            {learnedQuestionIds.includes('population') && (
              <>
                <dt>Population</dt>
                <dd>
                  <RangeWithValue stat={populationStat(facts)} />
                </dd>
              </>
            )}
            {learnedQuestionIds.includes('ihdi') && (
              <>
                <dt>IHDI</dt>
                <dd className="country-info-panel__ihdi">
                  <RangeWithValue
                    stat={ihdiStat(facts)}
                    afterBound={
                      // Not keyed by country, so an open breakdown stays open
                      // when another country is selected.
                      <IhdiBreakdownButton breakdown={facts.ihdiBreakdown} />
                    }
                  />
                </dd>
              </>
            )}
            {learnedQuestionIds.includes('capital') && (
              <>
                <dt>{facts.capitals.length === 1 ? 'Capital' : 'Capitals'}</dt>
                <dd>{facts.capitals.join(', ')}</dd>
              </>
            )}
          </dl>
          {showCountryInfo && INFO_QUESTION_IDS.some((id) => learnedQuestionIds.includes(id)) && (
            <CountryInfoSections
              key={facts.isoAlpha3}
              isoAlpha3={facts.isoAlpha3}
              learnedQuestionIds={learnedQuestionIds}
            />
          )}
        </>
      )}
    </aside>
  )
}
