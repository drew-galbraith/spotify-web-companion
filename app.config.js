import 'dotenv/config';

export default {
  expo: {
    name: 'WanderTunes',
    slug: 'wandertunes',
    scheme: 'wandertunes',
    extra: {
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      spotifyRedirectUri: "https://auth.expo.io/@scubadrew0716/wandertunes",
      "eas": {
        "projectId": "31bda9e7-6f12-442d-8685-783f78c4e7c4"
      }
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.scubadrew0716.wandertunes",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSMicrophoneUsageDescription": "WanderTunes does not record audio, but the microphone permission is required by third-party playback services to function properly."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0F172A"
      },
      "package": "com.scubadrew0716.wandertunes",
      "permissions": [
        "android.permission.RECORD_AUDIO"
      ]
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/images/favicon.png"
    },
  },
};
