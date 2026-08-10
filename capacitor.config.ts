import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.acsinformatica.atendimentoacs',
  appName: 'Atendimento ACS',
  webDir: 'dist',
  server: {
    url: 'https://atendimento-acs.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
