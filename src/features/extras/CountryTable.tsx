import { useEffect, useRef, useState } from 'react'
import { BackButton } from '../../shared/BackButton'
import {
  formatStat,
  sortedCountries,
  statValue,
  TABLE_STATS,
  type TableOrderId,
  type TableStatId,
} from './countryOrdering'
import './CountryTable.css'

type CountryTableProps = {
  onBack: () => void
}

// The column headings. Area's unit is here rather than in each cell, to
// keep the column narrow on a phone.
const HEADINGS: Record<TableStatId, string> = {
  area: 'Area km²',
  population: 'Population',
  ihdi: 'IHDI',
}

// Opened from "Table of all country stats" on the Extras menu: every country
// with its area, population and IHDI. Tapping a column's heading orders the
// table by it (names A–Z, stats largest first), and tapping it again reverses
// that. The ordered-by column is highlighted, and its heading shows ▼ for
// descending (largest first, Z–A) or ▲ for ascending. Rows don't respond to
// taps.
//
// The table scrolls inside its own box, below the title. Where the columns
// don't fit (phones), the headings stay at the top and the rank and name stay
// at the left while the stats scroll sideways, and a fade at the right edge
// shows there are more columns until the last is in view.
export function CountryTable({ onBack }: CountryTableProps) {
  // Opens ordered by area, largest first.
  const [orderId, setOrderId] = useState<TableOrderId>('area')
  const [isReversed, setIsReversed] = useState(false)
  const countries = sortedCountries(orderId, isReversed)

  // The box the table scrolls in, and whether any columns are hidden off its
  // right edge (which shows the fade).
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [hasMoreRight, setHasMoreRight] = useState(false)

  function updateHasMoreRight() {
    const scroller = scrollerRef.current
    if (scroller === null) return
    // The 1px allows for scroll positions rounded to fractions of a pixel.
    setHasMoreRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1)
  }

  // Checked when the screen opens and whenever the window changes size (e.g.
  // a phone turned sideways), as well as on each scroll.
  useEffect(() => {
    updateHasMoreRight()
    window.addEventListener('resize', updateHasMoreRight)
    return () => window.removeEventListener('resize', updateHasMoreRight)
  }, [])

  // Names start ascending (A–Z), stats descending (largest first).
  const isDescending = orderId === 'name' ? isReversed : !isReversed

  // The same heading reverses the order; another starts in its first order.
  function orderBy(nextOrderId: TableOrderId) {
    if (nextOrderId === orderId) {
      setIsReversed(!isReversed)
    } else {
      setOrderId(nextOrderId)
      setIsReversed(false)
    }
  }

  // Rows are numbered by their place in the order, but not when ordered by
  // name. Countries with no value (only some IHDIs) get no number, so the
  // numbers count only those with one.
  const ranks: (number | null)[] = []
  let countWithValue = 0
  for (const country of countries) {
    if (orderId === 'name' || statValue(country, orderId) === null) {
      ranks.push(null)
    } else {
      countWithValue += 1
      ranks.push(countWithValue)
    }
  }

  // A column heading, as a button that orders the table by it.
  function heading(id: TableOrderId, text: string, className: string) {
    const isOrderedBy = id === orderId
    return (
      <th
        key={id}
        className={isOrderedBy ? `${className} is-ordered-by` : className}
        aria-sort={isOrderedBy ? (isDescending ? 'descending' : 'ascending') : undefined}
      >
        <button className="country-table__heading" onClick={() => orderBy(id)}>
          {text}
          {isOrderedBy && (
            <>
              {' '}
              {/* Not bold: the symbol font has only the regular weight. */}
              <span className="country-table__arrow">{isDescending ? '▼' : '▲'}</span>
            </>
          )}
        </button>
      </th>
    )
  }

  return (
    <main className="country-table">
      <BackButton onClick={onBack} label="← Extras" />
      <h1>All countries</h1>
      <div
        className={hasMoreRight ? 'country-table__frame has-more-right' : 'country-table__frame'}
      >
        <div className="country-table__scroller" ref={scrollerRef} onScroll={updateHasMoreRight}>
          <table className="country-table__table">
            <thead>
              <tr>
                <th className="country-table__rank" aria-label="Rank" />
                {heading('name', 'Country', 'country-table__name')}
                {TABLE_STATS.map((statId) =>
                  heading(statId, HEADINGS[statId], 'country-table__stat'),
                )}
              </tr>
            </thead>
            <tbody>
              {countries.map((country, index) => {
                return (
                  <tr key={country.isoAlpha3}>
                    <td className="country-table__rank">{ranks[index] ?? ''}</td>
                    <td
                      className={
                        orderId === 'name'
                          ? 'country-table__name is-ordered-by'
                          : 'country-table__name'
                      }
                    >
                      {country.commonName}
                    </td>
                    {TABLE_STATS.map((statId) => (
                      <td
                        key={statId}
                        className={
                          statId === orderId
                            ? 'country-table__stat is-ordered-by'
                            : 'country-table__stat'
                        }
                      >
                        {formatStat(country, statId)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
