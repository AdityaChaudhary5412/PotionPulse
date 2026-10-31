import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.potionpulse.app',
  appName: 'PotionPulse',
  webDir: 'dist',
  server: {
    // Allows loading over https scheme inside WebView while permitting cleartext HTTP calls
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    // Capacitor plugins configurations if needed
  }
};

export default config;

