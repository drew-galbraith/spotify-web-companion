import { create } from "zustand";
import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";
import { Audio, AVPlaybackStatus } from "expo-av";

// Basic track info
export interface Track {
  id: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl?: string;
  duration_ms: number;
  preview_url?: string;
  uri?: string;
  playlistId?: string;
  playlistName?: string;
}

// Spotify Connect device
export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
  is_restricted: boolean;
  is_private_session: boolean;
}

// Auth context for refreshing tokens
export interface AuthContext {
  refreshSpotifyToken: () => Promise<string | null>;
}

// Full player state
export interface PlayerState {
  // Playback state
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  sound: Audio.Sound | null;

  // UI visibility
  isPlayerVisible: boolean;
  showPlayer: () => void;
  hidePlayer: () => void;
  togglePlayerVisibility: () => void;

  // Token/auth
  authContext: AuthContext | null;
  setAuthContext: (ctx: AuthContext | null) => void;

  // Low-level request helper
  makeAuthenticatedRequest: (url: string, options: RequestInit) => Promise<Response>;

  // Playback controls
  playTrack: (track: Track) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  stopTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;

  // Progress updates
  playbackPosition: number;
  playbackDuration: number;
  updatePlaybackPosition: (sec: number) => void;
  updatePlaybackDuration: (sec: number) => void;

  // Shuffle & repeat
  shuffleActive: boolean;
  toggleShuffle: () => void;
  repeatMode: "off" | "context" | "track";
  cycleRepeatMode: () => void;

  // Sync with Spotify
  syncPlaybackState: () => Promise<void>;

  // Web Playback SDK
  webPlayerReady: boolean;
  webPlayerVisible: boolean;
  initWebPlayer: () => Promise<void>;
  connectWebPlayer: () => Promise<void>;
  toggleWebPlayerVisibility: () => void;

  // Spotify Connect
  isSpotifyConnectActive: boolean;
  toggleSpotifyConnectActive: () => void;
  spotifyDevices: SpotifyDevice[];
  activeDevice: SpotifyDevice | null;
  fetchSpotifyDevices: () => Promise<SpotifyDevice[]>;
  transferPlayback: (deviceId: string) => Promise<void>;
  skipToNextOnSpotifyConnect: () => Promise<void>;
  skipToPreviousOnSpotifyConnect: () => Promise<void>;
  seekToPosition: (posSecs: number) => Promise<void>;

  // Fallback connect controls
  playOnSpotifyConnect: (track: Track) => Promise<void>;
  pauseOnSpotifyConnect: () => Promise<void>;
  resumeOnSpotifyConnect: () => Promise<void>;
  setVolumeOnConnect: (volume: number) => Promise<void>;

  // Open in Spotify
  openInSpotify: (uri: string) => Promise<void>;

  // Error state
  error: string | null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      volume: 1.0,
      sound: null,
      isPlayerVisible: false,
      authContext: null,

      // Progress
      playbackPosition: 0,
      playbackDuration: 0,

      // Shuffle & repeat
      shuffleActive: false,
      repeatMode: "off",

      // Web & Connect flags
      webPlayerReady: false,
      webPlayerVisible: false,
      isSpotifyConnectActive: false,
      spotifyDevices: [],
      activeDevice: null,

      // Error
      error: null,

      // UI visibility
      showPlayer: () => set({ isPlayerVisible: true }),
      hidePlayer: () => set({ isPlayerVisible: false }),
      togglePlayerVisibility: () =>
        set((s) => ({ isPlayerVisible: !s.isPlayerVisible })),

      // Auth context
      setAuthContext: (ctx) => set({ authContext: ctx }),

      // Authenticated fetch
      makeAuthenticatedRequest: async (url, options) => {
        let token = await AsyncStorage.getItem("spotify_token");
        if (!token) throw new Error("No Spotify token");
        let res = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          const newToken = await get().authContext?.refreshSpotifyToken();
          if (newToken) {
            await AsyncStorage.setItem("spotify_token", newToken);
            res = await fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            });
          }
        }
        return res;
      },

      // Playback methods
      playTrack: async (track) => {
        set({
          isLoading: true,
          currentTrack: track,
          isPlayerVisible: true,
          error: null,
        });
        try {
          // Stop existing sound
          if (get().sound) {
            await get().sound.unloadAsync();
          }
          // Expo AV preview
          if (track.preview_url) {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
            });
            const { sound } = await Audio.Sound.createAsync(
              { uri: track.preview_url },
              { shouldPlay: true, volume: get().volume },
              (status: AVPlaybackStatus) => {
                if (status.isLoaded) {
                  get().updatePlaybackPosition(status.positionMillis / 1000);
                  get().updatePlaybackDuration(
                    (status.durationMillis || 0) / 1000
                  );
                  if (status.didJustFinish) {
                    set({ isPlaying: false });
                  }
                }
              }
            );
            set({ sound, isPlaying: true, isLoading: false });
            return;
          }
          // Fallback to Connect
          await get().playOnSpotifyConnect(track);
          set({ isLoading: false, isPlaying: true });
        } catch (e: any) {
          console.error(e);
          set({ error: e.message, isLoading: false, isPlaying: false });
        }
      },
      pauseTrack: async () => {
        set({ isLoading: true });
        try {
          if (get().sound) {
            await get().sound.pauseAsync();
          } else {
            await get().pauseOnSpotifyConnect();
          }
          set({ isPlaying: false, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
      resumeTrack: async () => {
        set({ isLoading: true });
        try {
          if (get().sound) {
            await get().sound.playAsync();
          } else {
            await get().resumeOnSpotifyConnect();
          }
          set({ isPlaying: true, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
      stopTrack: async () => {
        try {
          if (get().sound) {
            await get().sound.stopAsync();
            await get().sound.unloadAsync();
            set({ sound: null, isPlaying: false });
          } else {
            await get().pauseOnSpotifyConnect();
            set({ isPlaying: false });
          }
        } catch {}
      },
      setVolume: async (vol) => {
        set({ volume: vol });
        if (get().sound) {
          await get().sound.setVolumeAsync(vol);
        } else {
          await get().setVolumeOnConnect(vol);
        }
      },

      // Progress updates
      updatePlaybackPosition: (sec) => set({ playbackPosition: sec }),
      updatePlaybackDuration: (sec) => set({ playbackDuration: sec }),

      // Shuffle & repeat
      toggleShuffle: () =>
        set((s) => ({ shuffleActive: !s.shuffleActive })),
      cycleRepeatMode: () => {
        const modes: PlayerState["repeatMode"][] = ["off", "context", "track"];
        set((s) => {
          const next =
            modes[(modes.indexOf(s.repeatMode) + 1) % modes.length];
          return { repeatMode: next };
        });
      },

      // Sync with Spotify endpoint
      syncPlaybackState: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) return;
          const res = await fetch("https://api.spotify.com/v1/me/player", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.item) {
            get().setAuthContext(get().authContext); // no-op to get latest
            // You can update currentTrack, isPlaying, position, duration here
          }
        } catch (e) {}
      },

      // Web Playback SDK stubs
      initWebPlayer: async () =>
        console.warn("initWebPlayer not implemented"),
      connectWebPlayer: async () =>
        console.warn("connectWebPlayer not implemented"),
      toggleWebPlayerVisibility: () =>
        set((s) => ({ webPlayerVisible: !s.webPlayerVisible })),

      // Spotify Connect stubs
      toggleSpotifyConnectActive: () =>
        set((s) => ({ isSpotifyConnectActive: !s.isSpotifyConnectActive })),
      fetchSpotifyDevices: async () => {
        console.warn("fetchSpotifyDevices not implemented");
        return [];
      },
      transferPlayback: async (deviceId) =>
        console.warn("transferPlayback not implemented for", deviceId),
      skipToNextOnSpotifyConnect: async () =>
        console.warn("skipToNextOnSpotifyConnect stub"),
      skipToPreviousOnSpotifyConnect: async () =>
        console.warn("skipToPreviousOnSpotifyConnect stub"),
      seekToPosition: async (posSecs) =>
        console.warn("seekToPosition stub", posSecs),

      // Fallback connect controls
      playOnSpotifyConnect: async (track) =>
        console.warn("playOnSpotifyConnect not implemented", track),
      pauseOnSpotifyConnect: async () =>
        console.warn("pauseOnSpotifyConnect not implemented"),
      resumeOnSpotifyConnect: async () =>
        console.warn("resumeOnSpotifyConnect not implemented"),
      setVolumeOnConnect: async (vol) =>
        console.warn("setVolumeOnConnect not implemented", vol),

      // Open in Spotify
      openInSpotify: async (uri) => {
        try {
          const spotifyUrl = uri.startsWith("spotify:")
            ? uri
            : `spotify:track:${uri}`;
          const can = await Linking.canOpenURL(spotifyUrl);
          if (can) await Linking.openURL(spotifyUrl);
        } catch (e) {
          console.warn("openInSpotify failed", e);
        }
      },
    }),
    {
      name: "wandertunes-player-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        isPlayerVisible: state.isPlayerVisible,
        volume: state.volume,
        playbackPosition: state.playbackPosition,
        playbackDuration: state.playbackDuration,
        shuffleActive: state.shuffleActive,
        repeatMode: state.repeatMode,
      }),
    }
  )
);
