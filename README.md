# WanderTunes

A React Native app that combines Spotify listening data with travel planning to create the perfect soundtrack for your journeys.

## Features

- View your Spotify listening statistics
- Create trips and travel plans
- Generate playlists based on your travel destinations
- Discover local music for your destinations

## Setup for Real Spotify Authentication

To use real Spotify authentication instead of mock data:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Set the Redirect URI to: `wandertunes://redirect`
4. Copy your Client ID
5. Open `context/auth-context.tsx` and replace the CLIENT_ID with your actual Client ID

## Running the App

```bash
npm install
npx expo start
```

## Technologies Used

- React Native with Expo
- Expo Router for navigation
- Spotify Web API
- Zustand for state management
- React Query for data fetching