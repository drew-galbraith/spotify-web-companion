import { create } from "zustand";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as Linking from "expo-linking";

interface Track {
  id: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl: string;
  duration_ms: number;
  preview_url?: string;
  uri?: string; // Spotify URI for full track playback
  playlistId?: string; // ID of the playlist this track belongs to
  playlistName?: string; // Name of the playlist this track belongs to
}

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
  is_restricted: boolean;
  is_private_session: boolean;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  sound: Audio.Sound | null;
  isLoading: boolean;
  error: string | null;
  isPlayerVisible: boolean; // Track player visibility
  playTrack: (track: Track) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  stopTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  showPlayer: () => void;
  hidePlayer: () => void;
  togglePlayerVisibility: () => void;
  // For Web Playback SDK
  webPlayer: any | null;
  webPlayerReady: boolean;
  webPlayerVisible: boolean; // Track web player visibility
  initWebPlayer: () => Promise<void>;
  connectWebPlayer: () => Promise<void>;
  disconnectWebPlayer: () => Promise<void>;
  showWebPlayer: () => void;
  hideWebPlayer: () => void;
  toggleWebPlayerVisibility: () => void;
  // For mobile deep linking
  openInSpotify: (trackUri: string) => Promise<void>;
  // For Spotify Connect (iOS sync playback)
  spotifyDevices: SpotifyDevice[];
  activeDevice: SpotifyDevice | null;
  isSpotifyConnectActive: boolean;
  fetchSpotifyDevices: () => Promise<SpotifyDevice[]>;
  transferPlayback: (deviceId: string) => Promise<void>;
  setActiveDevice: (device: SpotifyDevice | null) => void;
  playOnSpotifyConnect: (track: Track) => Promise<void>;
  pauseOnSpotifyConnect: () => Promise<void>;
  resumeOnSpotifyConnect: () => Promise<void>;
  skipToNextOnSpotifyConnect: () => Promise<void>;
  skipToPreviousOnSpotifyConnect: () => Promise<void>;
  seekOnSpotifyConnect: (positionMs: number) => Promise<void>;
  toggleSpotifyConnectActive: () => void;
  syncPlaybackState: () => Promise<void>;
  playbackPosition: number;
  playbackDuration: number;
  updatePlaybackPosition: (position: number) => void;
  updatePlaybackDuration: (duration: number) => void;
  startPlaybackSync: () => void;
  stopPlaybackSync: () => void;
  seekToPosition: (position: number) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 1.0,
      sound: null,
      isLoading: false,
      error: null,
      isPlayerVisible: true, // Default to visible when a track is playing
      webPlayer: null,
      webPlayerReady: false,
      webPlayerVisible: false, // Default to hidden until user activates it
      // Spotify Connect state
      spotifyDevices: [],
      activeDevice: null,
      isSpotifyConnectActive: false,
      playbackPosition: 0,
      playbackDuration: 0,
      
      updatePlaybackPosition: (position: number) => set({ playbackPosition: position }),
      
      updatePlaybackDuration: (duration: number) => set({ playbackDuration: duration }),
      
      showPlayer: () => set({ isPlayerVisible: true }),
      hidePlayer: () => set({ isPlayerVisible: false }),
      togglePlayerVisibility: () => set(state => ({ isPlayerVisible: !state.isPlayerVisible })),
      
      showWebPlayer: () => set({ webPlayerVisible: true }),
      hideWebPlayer: () => set({ webPlayerVisible: false }),
      toggleWebPlayerVisibility: () => set(state => ({ webPlayerVisible: !state.webPlayerVisible })),
      
      toggleSpotifyConnectActive: () => set(state => ({ 
        isSpotifyConnectActive: !state.isSpotifyConnectActive 
      })),
      
      setActiveDevice: (device: SpotifyDevice | null) => set({ activeDevice: device }),
      
      // Seek to a specific position
      seekToPosition: async (position: number) => {
        // For iOS Spotify Connect
        if (Platform.OS === 'ios' && get().isSpotifyConnectActive) {
          try {
            await get().seekOnSpotifyConnect(position * 1000); // Convert to milliseconds
            return;
          } catch (error) {
            console.error('Error seeking on Spotify Connect:', error);
            // Fall back to local seek if Connect fails
          }
        }
        
        // For Web Playback SDK
        if (Platform.OS === 'web' && get().webPlayerReady && get().webPlayerVisible) {
          try {
            const token = await AsyncStorage.getItem('spotify_token');
            if (token) {
              const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(position * 1000)}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok && response.status !== 204) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to seek');
              }
              
              set({ playbackPosition: position });
              console.log(`Seeked to position ${position}s via Web Playback SDK`);
              return;
            }
          } catch (error) {
            console.error('Error seeking web playback:', error);
            set({ error: 'Failed to seek' });
          }
        }
        
        // For mobile or fallback
        const sound = get().sound;
        if (sound) {
          try {
            await sound.setPositionAsync(position * 1000); // Convert to milliseconds
            set({ playbackPosition: position });
            console.log(`Seeked to position ${position}s`);
          } catch (error) {
            console.error("Error seeking:", error);
            set({ error: "Failed to seek" });
          }
        }
      },
      
      // Fetch available Spotify devices
      fetchSpotifyDevices: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            console.log("No authentication token available for device fetch");
            return [];
          }
          
          const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch devices: ${response.status}`);
          }
          
          const data = await response.json();
          const devices = data.devices || [];
          
          // Update state with devices
          set({ spotifyDevices: devices });
          
          // If we have an active device, set it
          const activeDevice = devices.find(d => d.is_active);
          if (activeDevice) {
            set({ activeDevice: activeDevice });
          } else if (devices.length > 0 && !get().activeDevice) {
            // If no active device but we have devices, set the first one
            set({ activeDevice: devices[0] });
          }
          
          console.log(`Found ${devices.length} Spotify devices`);
          return devices;
        } catch (error) {
          console.error("Error fetching Spotify devices:", error);
          return [];
        }
      },
      
      // Transfer playback to a specific device
      transferPlayback: async (deviceId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          const response = await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [deviceId],
              play: get().isPlaying, // Maintain current playback state
            }),
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to transfer playback");
          }
          
          // Update active device
          const device = get().spotifyDevices.find(d => d.id === deviceId);
          if (device) {
            set({ activeDevice: device });
          }
          
          // Refresh device list after transfer
          await get().fetchSpotifyDevices();
          
          set({ isLoading: false, isSpotifyConnectActive: true });
          console.log(`Transferred playback to device: ${deviceId}`);
        } catch (error) {
          console.error("Error transferring playback:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to transfer playback",
            isLoading: false
          });
        }
      },
      
      // Play a specific track using Spotify Connect
      playOnSpotifyConnect: async (track: Track) => {
        try {
          if (!track.uri) {
            throw new Error("Track URI is required for Spotify Connect playback");
          }
          
          set({ 
            isLoading: true, 
            error: null, 
            currentTrack: track,
            isPlayerVisible: true
          });
          
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          // If we have an active device, use it, otherwise don't specify (Spotify will choose)
          const deviceId = get().activeDevice?.id;
          const deviceQuery = deviceId ? `?device_id=${deviceId}` : "";
          
          const response = await fetch(`https://api.spotify.com/v1/me/player/play${deviceQuery}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: [track.uri],
            }),
          });
          
          if (!response.ok && response.status !== 204) {
            // If response is 404, it might mean no active device
            if (response.status === 404) {
              // Try to fetch devices and activate one
              const devices = await get().fetchSpotifyDevices();
              if (devices.length > 0) {
                await get().transferPlayback(devices[0].id);
                // Try playing again
                return await get().playOnSpotifyConnect(track);
              } else {
                throw new Error("No active Spotify device found. Open Spotify on another device first.");
              }
            }
            
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to play track");
          }
          
          // Start syncing playback state
          get().startPlaybackSync();
          
          set({ 
            isPlaying: true, 
            isLoading: false,
            isSpotifyConnectActive: true
          });
          
          console.log(`Playing track on Spotify Connect: ${track.name}`);
        } catch (error) {
          console.error("Error playing on Spotify Connect:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to play on Spotify Connect",
            isLoading: false
          });
          
          // Fall back to preview URL if available
          if (track.preview_url) {
            console.log("Falling back to preview URL");
            await get().playTrack(track);
          }
        }
      },
      
      // Pause playback on Spotify Connect
      pauseOnSpotifyConnect: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          // If we have an active device, use it, otherwise don't specify
          const deviceId = get().activeDevice?.id;
          const deviceQuery = deviceId ? `?device_id=${deviceId}` : "";
          
          const response = await fetch(`https://api.spotify.com/v1/me/player/pause${deviceQuery}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to pause playback");
          }
          
          set({ isPlaying: false });
          console.log("Paused playback on Spotify Connect");
        } catch (error) {
          console.error("Error pausing on Spotify Connect:", error);
          set({ error: error instanceof Error ? error.message : "Failed to pause playback" });
        }
      },
      
      // Resume playback on Spotify Connect
      resumeOnSpotifyConnect: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          // If we have an active device, use it, otherwise don't specify
          const deviceId = get().activeDevice?.id;
          const deviceQuery = deviceId ? `?device_id=${deviceId}` : "";
          
          const response = await fetch(`https://api.spotify.com/v1/me/player/play${deviceQuery}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to resume playback");
          }
          
          // Start syncing playback state
          get().startPlaybackSync();
          
          set({ isPlaying: true });
          console.log("Resumed playback on Spotify Connect");
        } catch (error) {
          console.error("Error resuming on Spotify Connect:", error);
          set({ error: error instanceof Error ? error.message : "Failed to resume playback" });
        }
      },
      
      // Skip to next track on Spotify Connect
      skipToNextOnSpotifyConnect: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          // If we have an active device, use it, otherwise don't specify
          const deviceId = get().activeDevice?.id;
          const deviceQuery = deviceId ? `?device_id=${deviceId}` : "";
          
          const response = await fetch(`https://api.spotify.com/v1/me/player/next${deviceQuery}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to skip to next track");
          }
          
          // Sync playback state to get new track info
          setTimeout(() => get().syncPlaybackState(), 500);
          
          console.log("Skipped to next track on Spotify Connect");
        } catch (error) {
          console.error("Error skipping to next on Spotify Connect:", error);
          set({ error: error instanceof Error ? error.message : "Failed to skip to next track" });
        }
      },
      
      // Skip to previous track on Spotify Connect
      skipToPreviousOnSpotifyConnect: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          // If we have an active device, use it, otherwise don't specify
          const deviceId = get().activeDevice?.id;
          const deviceQuery = deviceId ? `?device_id=${deviceId}` : "";
          
          const response = await fetch(`https://api.spotify.com/v1/me/player/previous${deviceQuery}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to skip to previous track");
          }
          
          // Sync playback state to get new track info
          setTimeout(() => get().syncPlaybackState(), 500);
          
          console.log("Skipped to previous track on Spotify Connect");
        } catch (error) {
          console.error("Error skipping to previous on Spotify Connect:", error);
          set({ error: error instanceof Error ? error.message : "Failed to skip to previous track" });
        }
      },
      
      // Seek to position on Spotify Connect
      seekOnSpotifyConnect: async (positionMs: number) => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            throw new Error("No authentication token available");
          }
          
          // If we have an active device, use it, otherwise don't specify
          const deviceId = get().activeDevice?.id;
          const deviceQuery = deviceId ? `&device_id=${deviceId}` : "";
          
          const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}${deviceQuery}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to seek");
          }
          
          set({ playbackPosition: positionMs / 1000 }); // Convert to seconds for UI
          console.log(`Seeked to position ${positionMs}ms on Spotify Connect`);
        } catch (error) {
          console.error("Error seeking on Spotify Connect:", error);
          set({ error: error instanceof Error ? error.message : "Failed to seek" });
        }
      },
      
      // Sync playback state with Spotify
      syncPlaybackState: async () => {
        try {
          const token = await AsyncStorage.getItem("spotify_token");
          if (!token) {
            return;
          }
          
          const response = await fetch("https://api.spotify.com/v1/me/player", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          // If no content, there's no active player
          if (response.status === 204) {
            return;
          }
          
          if (!response.ok) {
            return;
          }
          
          const data = await response.json();
          
          // If no data or no item, return
          if (!data || !data.item) {
            return;
          }
          
          // Update current track if different
          const spotifyTrack = data.item;
          const currentTrack = get().currentTrack;
          
          if (!currentTrack || currentTrack.id !== spotifyTrack.id) {
            const track: Track = {
              id: spotifyTrack.id,
              name: spotifyTrack.name,
              artists: spotifyTrack.artists.map((a: any) => a.name),
              albumName: spotifyTrack.album.name,
              albumImageUrl: spotifyTrack.album.images[0]?.url || '',
              duration_ms: spotifyTrack.duration_ms,
              uri: spotifyTrack.uri,
              preview_url: spotifyTrack.preview_url,
              // Preserve playlist info if it exists
              playlistId: currentTrack?.playlistId,
              playlistName: currentTrack?.playlistName
            };
            
            set({ currentTrack: track });
          }
          
          // Update playback state
          set({
            isPlaying: data.is_playing,
            playbackPosition: data.progress_ms ? data.progress_ms / 1000 : 0, // Convert to seconds
            playbackDuration: data.item.duration_ms ? data.item.duration_ms / 1000 : 0 // Convert to seconds
          });
          
          // Update active device if available
          if (data.device) {
            const activeDevice = get().spotifyDevices.find(d => d.id === data.device.id);
            if (activeDevice) {
              set({ activeDevice: activeDevice });
            } else {
              set({ 
                activeDevice: {
                  id: data.device.id,
                  name: data.device.name,
                  type: data.device.type,
                  is_active: true,
                  volume_percent: data.device.volume_percent,
                  is_restricted: data.device.is_restricted || false,
                  is_private_session: data.device.is_private_session || false
                }
              });
            }
          }
        } catch (error) {
          console.error("Error syncing playback state:", error);
        }
      },
      
      // Start periodic playback sync
      startPlaybackSync: () => {
        // Clear any existing interval
        get().stopPlaybackSync();
        
        // Set up new interval
        const syncInterval = setInterval(() => {
          if (get().isSpotifyConnectActive && get().isPlaying) {
            get().syncPlaybackState();
          }
        }, 3000); // Sync every 3 seconds
        
        // Store interval ID in AsyncStorage
        AsyncStorage.setItem("spotify_sync_interval", syncInterval.toString());
      },
      
      // Stop playback sync
      stopPlaybackSync: () => {
        AsyncStorage.getItem("spotify_sync_interval").then(intervalId => {
          if (intervalId) {
            clearInterval(parseInt(intervalId));
            AsyncStorage.removeItem("spotify_sync_interval");
          }
        });
      },
      
      initWebPlayer: async () => {
        // Only initialize Web Playback SDK on web platform
        if (Platform.OS !== 'web') {
          return;
        }
        
        try {
          // Check if Spotify Web Playback SDK script is already loaded
          if (!(window as any).Spotify) {
            // Load Spotify Web Playback SDK script
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
            
            // Wait for script to load
            await new Promise<void>((resolve) => {
              window.onSpotifyWebPlaybackSDKReady = () => {
                resolve();
              };
            });
          }
          
          console.log('Spotify Web Playback SDK loaded');
        } catch (error) {
          console.error('Failed to load Spotify Web Playback SDK:', error);
          set({ error: 'Failed to initialize Spotify player' });
        }
      },
      
      connectWebPlayer: async () => {
        if (Platform.OS !== 'web' || !(window as any).Spotify) {
          return;
        }
        
        try {
          set({ isLoading: true, error: null });
          
          // Get token from AsyncStorage
          const token = await AsyncStorage.getItem('spotify_token');
          if (!token) {
            console.log("No authentication token available for web player");
            set({ 
              isLoading: false, 
              error: "No authentication token available for web player",
              webPlayerReady: false
            });
            return;
          }
          
          // Check if user has premium (required for Web Playback SDK)
          const userProfileJson = await AsyncStorage.getItem('spotify_user_profile');
          if (!userProfileJson) {
            console.log("No user profile available to check premium status");
            set({
              isLoading: false,
              error: "Unable to verify premium status",
              webPlayerReady: false
            });
            return;
          }
          
          const userProfile = JSON.parse(userProfileJson);
          const isPremium = userProfile.product === "premium";
          
          if (!isPremium) {
            console.log("User does not have Spotify Premium, required for full playback");
            set({
              isLoading: false,
              error: "Spotify Premium required for full track playback",
              webPlayerReady: false
            });
            return;
          }
          
          // Create and initialize the Web Playback SDK player
          const player = new (window as any).Spotify.Player({
            name: 'WanderTunes Web Player',
            getOAuthToken: (cb: (token: string) => void) => {
              cb(token);
            },
            volume: get().volume
          });
          
          // Error handling
          player.addListener('initialization_error', ({ message }: { message: string }) => {
            console.error('Initialization error:', message);
            set({ error: `Player initialization failed: ${message}`, isLoading: false });
          });
          
          player.addListener('authentication_error', ({ message }: { message: string }) => {
            console.error('Authentication error:', message);
            set({ error: 'Authentication failed. Please log in again.', isLoading: false });
          });
          
          player.addListener('account_error', ({ message }: { message: string }) => {
            console.error('Account error:', message);
            set({ error: 'Premium account required for playback.', isLoading: false });
          });
          
          player.addListener('playback_error', ({ message }: { message: string }) => {
            console.error('Playback error:', message);
            set({ error: `Playback error: ${message}`, isLoading: false });
          });
          
          // Ready event
          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('Web Playback SDK ready with device ID:', device_id);
            // Store device ID in AsyncStorage for later use
            AsyncStorage.setItem('spotify_device_id', device_id);
            set({ webPlayerReady: true, isLoading: false, error: null });
          });
          
          // Not ready event
          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.log('Web Playback SDK not ready. Device ID:', device_id);
            set({ webPlayerReady: false });
          });
          
          // Player state changes
          player.addListener('player_state_changed', (state: any) => {
            if (!state) {
              return;
            }
            
            // Update player state based on Spotify state
            const isPlaying = !state.paused;
            set({ isPlaying });
            
            // If track changed, update current track
            if (state.track_window.current_track) {
              const spotifyTrack = state.track_window.current_track;
              const currentTrack = get().currentTrack;
              
              // Only update if it's a different track
              if (!currentTrack || currentTrack.id !== spotifyTrack.id) {
                const track: Track = {
                  id: spotifyTrack.id,
                  name: spotifyTrack.name,
                  artists: spotifyTrack.artists.map((a: any) => a.name),
                  albumName: spotifyTrack.album.name,
                  albumImageUrl: spotifyTrack.album.images[0]?.url || '',
                  duration_ms: spotifyTrack.duration_ms,
                  uri: spotifyTrack.uri,
                  // Preserve playlist info if it exists
                  playlistId: currentTrack?.playlistId,
                  playlistName: currentTrack?.playlistName
                };
                set({ currentTrack: track });
              }
            }
          });
          
          // Connect the player
          const connected = await player.connect();
          if (connected) {
            set({ webPlayer: player, error: null });
            console.log('Web Playback SDK connected');
          } else {
            throw new Error('Failed to connect to Spotify');
          }
        } catch (error) {
          console.error('Web player connection error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to connect to Spotify',
            isLoading: false,
            webPlayerReady: false
          });
        }
      },
      
      disconnectWebPlayer: async () => {
        const { webPlayer } = get();
        if (webPlayer && Platform.OS === 'web') {
          webPlayer.disconnect();
          set({ webPlayer: null, webPlayerReady: false });
          console.log('Web Playback SDK disconnected');
        }
      },
      
      openInSpotify: async (trackUri: string) => {
        try {
          // For mobile platforms, open the Spotify app
          if (Platform.OS !== 'web') {
            const spotifyUrl = `spotify:track:${trackUri.split(':')[2]}`;
            const canOpen = await Linking.canOpenURL(spotifyUrl);
            
            if (canOpen) {
              await Linking.openURL(spotifyUrl);
              console.log('Opened track in Spotify app');
              return true;
            } else {
              // If Spotify app is not installed, open in browser
              const webUrl = `https://open.spotify.com/track/${trackUri.split(':')[2]}`;
              await Linking.openURL(webUrl);
              console.log('Opened track in browser');
              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('Error opening Spotify:', error);
          set({ error: 'Failed to open Spotify' });
          return false;
        }
      },
      
      playTrack: async (track) => {
        try {
          set({ isLoading: true, error: null, isPlayerVisible: true });
          
          // Stop any currently playing track
          const currentSound = get().sound;
          if (currentSound) {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
          }
          
          // Set the current track immediately to update UI
          set({ currentTrack: track });
          
          // For iOS, if Spotify Connect is active and we have a URI, use that
          if (Platform.OS === 'ios' && track.uri && get().isSpotifyConnectActive) {
            try {
              await get().playOnSpotifyConnect(track);
              return;
            } catch (error) {
              console.error('Spotify Connect playback error:', error);
              // Fall back to preview URL if Connect fails
              set({ error: 'Spotify Connect playback failed. Trying preview...' });
            }
          }
          
          // Web Playback SDK (full tracks) for web platform with premium
          if (Platform.OS === 'web' && track.uri && get().webPlayerReady) {
            try {
              // Get token and device ID
              const token = await AsyncStorage.getItem('spotify_token');
              const deviceId = await AsyncStorage.getItem('spotify_device_id');
              
              if (!token || !deviceId) {
                throw new Error('Missing authentication or device information');
              }
              
              // Play the track using Spotify Connect API
              const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  uris: [track.uri]
                })
              });
              
              if (!response.ok) {
                // If response has no content (204), it's successful
                if (response.status !== 204) {
                  const errorData = await response.json();
                  throw new Error(errorData.error?.message || 'Failed to play track');
                }
              }
              
              set({ isPlaying: true, isLoading: false, error: null, webPlayerVisible: true });
              console.log('Playing track via Web Playback SDK:', track.name);
              return;
            } catch (error) {
              console.error('Web Playback SDK error:', error);
              // Fall back to preview URL if Web Playback fails
              set({ error: 'Full playback failed. Trying preview...' });
            }
          }
          
          // For all platforms, try to use preview URL
          if (track.preview_url) {
            console.log("Playing preview URL:", track.preview_url);
            
            // Set up audio mode for playback
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
            });
            
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: track.preview_url },
              { shouldPlay: true, volume: get().volume },
              (status: AVPlaybackStatus) => {
                // Update position for progress bar
                if (status.isLoaded) {
                  get().updatePlaybackPosition(status.positionMillis / 1000); // Convert to seconds
                  get().updatePlaybackDuration(status.durationMillis ? status.durationMillis / 1000 : 30); // Convert to seconds
                  
                  // When playback finishes
                  if (status.didJustFinish) {
                    set({ isPlaying: false });
                  }
                }
              }
            );
            
            set({ 
              isPlaying: true,
              sound: newSound,
              isLoading: false,
              error: null
            });
            
            console.log("Playing preview:", track.name);
            return;
          }
          
          // If no preview URL is available but we have a URI, show option to open in Spotify
          if (track.uri) {
            // For iOS, suggest enabling Spotify Connect
            if (Platform.OS === 'ios') {
              set({
                isPlaying: false,
                sound: null,
                isLoading: false,
                error: "No preview available. Enable Spotify Connect for full tracks."
              });
              return;
            }
            
            // For web, suggest enabling the web player
            if (Platform.OS === 'web') {
              set({
                isPlaying: false,
                sound: null,
                isLoading: false,
                error: "No preview available. Enable web player for full tracks.",
                webPlayerVisible: true // Show web player automatically
              });
              return;
            }
            
            // For Android, offer to open in Spotify app
            set({
              isPlaying: false,
              sound: null,
              isLoading: false,
              error: "No preview available. Open in Spotify app?"
            });
            return;
          }
          
          // If no preview URL or URI is available
          set({ 
            isPlaying: false,
            sound: null,
            isLoading: false,
            error: "No playback source available for this track"
          });
        } catch (error) {
          console.error("Error playing track:", error);
          set({ 
            isPlaying: false, 
            isLoading: false,
            error: "Failed to play track. Please try again."
          });
        }
      },
      
      pauseTrack: async () => {
        // For iOS Spotify Connect
        if (Platform.OS === 'ios' && get().isSpotifyConnectActive) {
          try {
            await get().pauseOnSpotifyConnect();
            return;
          } catch (error) {
            console.error('Error pausing Spotify Connect:', error);
            // Fall back to local pause if Connect fails
          }
        }
        
        // For Web Playback SDK
        if (Platform.OS === 'web' && get().webPlayerReady && get().webPlayerVisible) {
          try {
            const token = await AsyncStorage.getItem('spotify_token');
            if (token) {
              const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok && response.status !== 204) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to pause track');
              }
              
              set({ isPlaying: false });
              console.log('Paused playback via Web Playback SDK');
              return;
            }
          } catch (error) {
            console.error('Error pausing web playback:', error);
            set({ error: 'Failed to pause track' });
          }
        }
        
        // For mobile or fallback
        const sound = get().sound;
        if (sound) {
          try {
            await sound.pauseAsync();
            set({ isPlaying: false });
            console.log("Paused playback");
          } catch (error) {
            console.error("Error pausing track:", error);
            set({ error: "Failed to pause track" });
          }
        }
      },
      
      resumeTrack: async () => {
        // For iOS Spotify Connect
        if (Platform.OS === 'ios' && get().isSpotifyConnectActive) {
          try {
            await get().resumeOnSpotifyConnect();
            return;
          } catch (error) {
            console.error('Error resuming Spotify Connect:', error);
            // Fall back to local resume if Connect fails
          }
        }
        
        // For Web Playback SDK
        if (Platform.OS === 'web' && get().webPlayerReady && get().webPlayerVisible) {
          try {
            const token = await AsyncStorage.getItem('spotify_token');
            if (token) {
              const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok && response.status !== 204) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to resume track');
              }
              
              set({ isPlaying: true });
              console.log('Resumed playback via Web Playback SDK');
              return;
            }
          } catch (error) {
            console.error('Error resuming web playback:', error);
            set({ error: 'Failed to resume track' });
          }
        }
        
        // For mobile or fallback
        const sound = get().sound;
        if (sound) {
          try {
            set({ isLoading: true, error: null });
            await sound.playAsync();
            set({ isPlaying: true, isLoading: false });
            console.log("Resumed playback");
          } catch (error) {
            console.error("Error resuming track:", error);
            set({ 
              isPlaying: false, 
              isLoading: false,
              error: "Failed to resume track. Please try again."
            });
          }
        }
      },
      
      stopTrack: async () => {
        // For iOS Spotify Connect
        if (Platform.OS === 'ios' && get().isSpotifyConnectActive) {
          try {
            await get().pauseOnSpotifyConnect();
            get().stopPlaybackSync();
          } catch (error) {
            console.error('Error stopping Spotify Connect:', error);
          }
        }
        
        // For Web Playback SDK
        if (Platform.OS === 'web' && get().webPlayerReady && get().webPlayerVisible) {
          try {
            const token = await AsyncStorage.getItem('spotify_token');
            if (token) {
              const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok && response.status !== 204) {
                console.error('Error stopping web playback:', await response.text());
              }
            }
          } catch (error) {
            console.error('Error stopping web playback:', error);
          }
        }
        
        // For mobile or fallback
        const sound = get().sound;
        if (sound) {
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
            set({ 
              isPlaying: false,
              sound: null,
              error: null
            });
            console.log("Stopped playback");
          } catch (error) {
            console.error("Error stopping track:", error);
          }
        }
      },
      
      setVolume: async (volume) => {
        // For iOS Spotify Connect
        if (Platform.OS === 'ios' && get().isSpotifyConnectActive && get().activeDevice) {
          try {
            const token = await AsyncStorage.getItem('spotify_token');
            if (token) {
              const volumePercent = Math.round(volume * 100);
              const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok && response.status !== 204) {
                throw new Error('Failed to set volume on Spotify Connect');
              }
              
              set({ volume, error: null });
              console.log("Set Spotify Connect volume to:", volume);
              return;
            }
          } catch (error) {
            console.error("Error setting Spotify Connect volume:", error);
            set({ error: "Failed to set volume" });
          }
        }
        
        // For Web Playback SDK
        if (Platform.OS === 'web' && get().webPlayer && get().webPlayerVisible) {
          try {
            await get().webPlayer.setVolume(volume);
            set({ volume, error: null });
            console.log("Set web player volume to:", volume);
          } catch (error) {
            console.error("Error setting web player volume:", error);
            set({ error: "Failed to set volume" });
          }
        }
        
        // For mobile or fallback
        const sound = get().sound;
        if (sound) {
          try {
            await sound.setVolumeAsync(volume);
            set({ volume, error: null });
            console.log("Set volume to:", volume);
          } catch (error) {
            console.error("Error setting volume:", error);
            set({ error: "Failed to set volume" });
          }
        } else {
          set({ volume });
        }
      },
    }),
    {
      name: "wandertunes-player-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        volume: state.volume,
        isPlayerVisible: state.isPlayerVisible,
        webPlayerVisible: state.webPlayerVisible,
        isSpotifyConnectActive: state.isSpotifyConnectActive,
        // Don't persist sound object or isPlaying state
      }),
    }
  )
);