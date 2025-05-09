import 'dotenv/config';

export default {
  expo: {
    name: 'WanderTunes',
    slug: 'wandertunes',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'wandertunes',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0F172A'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.scubadrew0716.wandertunes',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription: 'WanderTunes does not record audio, but the microphone permission is required by third-party playback services to function properly.',
        LSApplicationQueriesSchemes: ['spotify'],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ['wandertunes']
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0F172A'
      },
      package: 'com.scubadrew0716.wandertunes',
      permissions: [
        'android.permission.RECORD_AUDIO'
      ]
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      [
        'expo-router',
        {
          origin: 'https://info.wandertunes.app/'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    owner: 'scubadrew0716',
    extra: {
      router: {
        origin: 'https://info.wandertunes.app/'
      },
      eas: {
        projectId: '31bda9e7-6f12-442d-8685-783f78c4e7c4'
      },
      // Use environment variables if available, otherwise fallback to hardcoded values
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID || '14457edd9cd944a08d5d1bcac2371875',
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      spotifyRedirectUri: 'https://auth.expo.io/@scubadrew0716/wandertunes'
    }
  }
};