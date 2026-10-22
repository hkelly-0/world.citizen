import { useRef, useState, type KeyboardEvent } from 'react'
import type { CountryFacts } from '../../shared/countryFacts'
import { searchCountries } from './countryNameSearch'
import './CountrySearch.css'

const SUGGESTIONS_ID = 'country-search-suggestions'

type CountrySearchProps = {
  // Called with the chosen country's ISO alpha-3 code, e.g. "FIN".
  onSelect: (isoAlpha3: string) => void
}

// A search box for the globe screen. Suggestions appear once 3 letters are
// typed; tapping one, or pressing Enter for the top (or arrow-key highlighted)
// one, chooses that country.
export function CountrySearch({ onSelect }: CountrySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  // Position in the suggestions of the one Enter would choose. Starts at the
  // top suggestion; the arrow keys move it.
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const suggestions = searchCountries(typed)
  const isListOpen = isFocused && suggestions.length > 0

  // Clears the box and unfocuses it, which closes the phone keyboard so the
  // info panel can be seen.
  function choose(country: CountryFacts) {
    setTyped('')
    setHighlightedIndex(0)
    inputRef.current?.blur()
    onSelect(country.isoAlpha3)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault()
      setHighlightedIndex(Math.min(highlightedIndex + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault()
      setHighlightedIndex(Math.max(highlightedIndex - 1, 0))
    } else if (event.key === 'Enter' && suggestions.length > 0) {
      event.preventDefault()
      choose(suggestions[highlightedIndex])
    } else if (event.key === 'Escape') {
      setTyped('')
      setHighlightedIndex(0)
    }
  }

  return (
    <div className="country-search" role="search">
      {/* Magnifying glass. */}
      <svg className="country-search__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" />
        <line x1="15" y1="15" x2="21" y2="21" />
      </svg>
      <input
        ref={inputRef}
        className="country-search__input"
        type="text"
        aria-label="Search countries"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isListOpen}
        aria-controls={SUGGESTIONS_ID}
        aria-activedescendant={isListOpen ? `${SUGGESTIONS_ID}-${highlightedIndex}` : undefined}
        // Shows a "search" key on phone keyboards, and stops the browser and
        // phone suggesting their own words.
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value)
          setHighlightedIndex(0)
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isListOpen && (
        <ul className="country-search__suggestions" id={SUGGESTIONS_ID} role="listbox">
          {suggestions.map((country, index) => (
            <li
              key={country.isoAlpha3}
              id={`${SUGGESTIONS_ID}-${index}`}
              className={
                index === highlightedIndex
                  ? 'country-search__suggestion country-search__suggestion--highlighted'
                  : 'country-search__suggestion'
              }
              role="option"
              aria-selected={index === highlightedIndex}
              // Keeps the focus in the box, which would otherwise blur and
              // close the list before the click arrives.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => choose(country)}
            >
              {country.commonName}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
