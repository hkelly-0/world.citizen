import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'world.citizen',
  appName: 'world.citizen',
  webDir: 'dist',
  plugins: {
    // Light status and navigation bar icons, to show on the app's dark background
    // (set as the window background in android/app/src/main/res/values/styles.xml).
    SystemBars: {
      style: 'DARK',
    },
  },
}

export default config
