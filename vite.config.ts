/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Lists the licences of every bundled library, shown on the Credits screen
    // (LIBRARY_LICENCES_URL in Credits.tsx).
    license: { fileName: 'third-party-licences.md' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
