import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Roboto Mono, bundled with the app so it works offline.
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/700.css'
import './index.css'
import App from './App.tsx'
import { removeOldSm2Progress } from './shared/progress'

// Progress saved before the switch to FSRS is deleted, not converted.
removeOldSm2Progress()

// Android's back button steps back through the app's history entries (see
// App.tsx), like the browser's back button, and closes the app on the menu.
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back()
    else CapacitorApp.exitApp()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
