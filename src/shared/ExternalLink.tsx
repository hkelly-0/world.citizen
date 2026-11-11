import type { ReactNode } from 'react'

// Opens outside the app: in a new tab on the website, in the phone's browser
// in the APK.
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}
