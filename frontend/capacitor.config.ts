import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.qzh.translater',
  appName: 'Translater',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
}

export default config
