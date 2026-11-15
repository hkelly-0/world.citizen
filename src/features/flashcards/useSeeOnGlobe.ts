import { useEffect, useState } from 'react'

// For "See on Globe" (SeeOnGlobe.tsx). Kept out of that file so it exports
// only components.
//
// The open globe has its own history entry on top of the flashcard screen's,
// holding the country, so back (browser or Android, or the globe's back
// button) returns to the card, and reloading the website stays on the globe.
function seeOnGlobeCodeInHistory(): string | null {
  return history.state?.seeOnGlobeCode ?? null
}

// The country shown on the globe, or null while the flashcards are shown, and
// a function that opens the globe on a country.
export function useSeeOnGlobe(): { code: string | null; open: (code: string) => void } {
  const [code, setCode] = useState<string | null>(seeOnGlobeCodeInHistory)

  // Back from the globe's history entry shows the flashcards again.
  useEffect(() => {
    const showCodeInHistory = () => setCode(seeOnGlobeCodeInHistory())
    window.addEventListener('popstate', showCodeInHistory)
    return () => window.removeEventListener('popstate', showCodeInHistory)
  }, [])

  function open(newCode: string) {
    history.pushState({ ...history.state, seeOnGlobeCode: newCode }, '')
    setCode(newCode)
  }

  return { code, open }
}
