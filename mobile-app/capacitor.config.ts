import type { CapacitorConfig } from '@capacitor/cli';

// MLJ NET GenieACS Platform - Mobile App Configuration
// This app connects to the running MLJ NET web server.
// Set SERVER_URL in .env or pass it during build.
// The bundled www/ directory contains a minimal landing page
// that detects the server and redirects.

const serverUrl = process.env.SERVER_URL || '';

const config: CapacitorConfig = {
  appId: 'com.mljnet.genieacs',
  appName: 'MLJ NET',
  webDir: 'www',
  // Bundled web assets - a connector page that loads the actual app from server
  server: {
    // Allow navigating to the MLJ NET server and GenieACS backends
    allowNavigation: [
      '*.local',
      'localhost',
      '127.0.0.1',
      '10.*',
      '172.16.*',
      '172.17.*',
      '172.18.*',
      '172.19.*',
      '172.2*',
      '172.3*',
      '192.168.*',
      '*.ngrok.io',
      '*.mljnet.*',
    ],
    // If SERVER_URL is set, load the app directly from the server
    // Otherwise load the bundled connector page from www/
    url: serverUrl || undefined,
    cleartext: true, // Allow HTTP (needed for local GenieACS instances)
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeInDuration: 300,
      launchFadeOutDuration: 500,
      backgroundColor: '#0a0e1a',
      showSpinner: true,
      spinnerColor: '#06b6d4',
      androidScaleType: 'CENTER_CROP',
      iosSpinnerStyle: 'large',
    },
    StatusBar: {
      style: 'DARK', // Light text/icons on dark background
      backgroundColor: '#0a0e1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    Network: {},
    App: {
      // Keep app running in background
    },
  },

  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0e1a',
    useLegacyBridge: false,
    // Allow HTTP cleartext traffic for local server connections
    networkSecurityConfig: 'xml/network_security_config.xml',
  },

  ios: {
    contentInset: 'automatic',
    allowsInlineMediaPlayback: true,
    scrollEnabled: true,
    disableScrollAssist: false,
    webViewTimeout: 30000,
    // Override light content status bar
    preferredContentMode: 'dark',
  },

  backgroundColor: '#0a0e1a',
  scheme: 'https',
};

export default config;