import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axellung.animalnations',
  appName: 'Animal Nations TD',
  webDir: 'dist',
  android: { backgroundColor: '#0f1626' },
  ios: { backgroundColor: '#0f1626', contentInset: 'always' },
};

export default config;
