import { useEffect, useId, useState } from 'react'
import { type CountryInfo, loadCountryInfo } from '../../shared/countryInfo'
import { INFO_QUESTION_IDS, type QuestionId } from '../flashcards/deck'
import './CountryInfoSections.css'

// The headings shown in the panel, in order. Shorter than the files' headings
// (COUNTRY_INFO_HEADINGS) where those are too long for a narrow panel.
const SECTION_LABELS: Record<keyof CountryInfo, string> = {
  history: 'History',
  people: 'People',
  economy: 'Economy',
  internationalRelations: 'Int. Relations',
}

type CountryInfoSectionsProps = {
  isoAlpha3: string
  // The information chosen in Settings; paragraphs left out there aren't shown.
  learnedQuestionIds: QuestionId[]
}

// The hand-written paragraphs about a country (History, People, etc.), each
// under a heading that opens and closes it. All start closed, and opening one
// closes any other. The parent should key this by country, so a newly
// selected country starts closed again.
export function CountryInfoSections({ isoAlpha3, learnedQuestionIds }: CountryInfoSectionsProps) {
  // Undefined until the country's file has loaded.
  const [info, setInfo] = useState<CountryInfo | undefined>(undefined)
  const [openSection, setOpenSection] = useState<keyof CountryInfo | null>(null)
  const id = useId()

  // The headings show straight away, so the globe can measure the panel's
  // full closed height; the text only has to arrive before one is opened.
  useEffect(() => {
    let cancelled = false
    loadCountryInfo(isoAlpha3).then((loaded) => {
      if (!cancelled) setInfo(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [isoAlpha3])

  const sections = INFO_QUESTION_IDS.filter((id) => learnedQuestionIds.includes(id))
  return (
    <div className="country-info-sections">
      {sections.map((section) => {
        const isOpen = openSection === section
        const paragraphId = `${id}-${section}`
        return (
          <section key={section}>
            <h3>
              <button
                className="country-info-sections__heading"
                aria-expanded={isOpen}
                aria-controls={paragraphId}
                onClick={() => setOpenSection(isOpen ? null : section)}
              >
                {SECTION_LABELS[section]}
              </button>
            </h3>
            <p id={paragraphId} className="country-info-sections__paragraph" hidden={!isOpen}>
              {info?.[section]}
            </p>
          </section>
        )
      })}
    </div>
  )
}
