import 'dotenv/config';

export default {
  expo: {
    name: 'WanderTunes',
    slug: 'wandertunes',
    scheme: 'wandertunes',
    extra: {
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      spotifyRedirectUri: "https://auth.expo.io/@scubadrew0716/wandertunes"
    },
  },
};
