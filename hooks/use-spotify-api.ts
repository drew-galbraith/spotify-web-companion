import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests
const RATE_LIMIT_BACKOFF_BASE = 2000; // Base backoff time in ms

export function useSpotifyApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = async (): Promise<string> => {
    const token = await AsyncStorage.getItem("spotify_token");
    if (!token) {
      throw new Error("No authentication token available");
    }
    return token;
  };

  const fetchFromSpotify = useCallback(async (endpoint: string, options: RequestInit = {}, bypassCache = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Normalize endpoint to prevent duplicate v1 paths
      const normalizedEndpoint = endpoint.startsWith("/v1/") 
        ? endpoint 
        : endpoint.startsWith("/") 
          ? `/v1${endpoint}` 
          : `/v1/${endpoint}`;
      
      // Construct the full URL
      const url = endpoint.startsWith("https://") 
        ? endpoint 
        : `https://api.spotify.com${normalizedEndpoint}`;
      
      // Check cache first if not bypassing
      const cacheKey = `${url}:${JSON.stringify(options)}`;
      if (!bypassCache && apiCache.has(cacheKey)) {
        const cachedData = apiCache.get(cacheKey);
        if (Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
          console.log(`Using cached response for ${url}`);
          setIsLoading(false);
          return cachedData.data;
        } else {
          // Cache expired, remove it
          apiCache.delete(cacheKey);
        }
      }
      
      // Implement rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        // Wait before making the next request
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      console.log("Fetching from Spotify:", url);
      lastRequestTime = Date.now();
      
      const token = await getToken();
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "2");
        const backoffTime = Math.max(retryAfter * 1000, RATE_LIMIT_BACKOFF_BASE);
        console.log(`Rate limited. Retrying after ${backoffTime/1000} seconds.`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return fetchFromSpotify(endpoint, options, bypassCache); // Retry the request
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null;
      }

      // Check for empty response
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.log("Empty response received from Spotify API");
        if (response.ok) {
          return null; // Return null for empty but successful responses
        } else {
          throw new Error(`Spotify API error: ${response.status} ${response.statusText} - Empty response`);
        }
      }

      // Parse JSON only if we have content
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error("JSON parse error:", errorMessage, "Response text:", responseText);
        throw new Error(`Failed to parse Spotify API response: ${errorMessage}`);
      }
      
      // Check for errors
      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
      }

      // Cache successful responses
      if (!bypassCache) {
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching from Spotify:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add safeSpotifyCall function to handle errors gracefully
  const safeSpotifyCall = useCallback(async <T>(apiCall: () => Promise<T>, defaultValue: T): Promise<T> => {
    try {
      return await apiCall();
    } catch (error) {
      console.warn("API call failed, returning default value:", error);
      return defaultValue;
    }
  }, []);

  // Clear cache for specific endpoint or all cache
  const clearCache = useCallback((endpoint?: string) => {
    if (endpoint) {
      // Clear specific endpoint cache
      const url = endpoint.startsWith("https://") 
        ? endpoint 
        : `https://api.spotify.com/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      
      for (const key of apiCache.keys()) {
        if (key.startsWith(`${url}:`)) {
          apiCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      apiCache.clear();
    }
  }, []);

  // User Profile
  const getCurrentUserProfile = useCallback(async () => {
    return fetchFromSpotify("/me");
  }, [fetchFromSpotify]);

  // Playlists
  const createPlaylist = useCallback(async (userId: string, name: string, description: string = "") => {
    return fetchFromSpotify(`/users/${userId}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    }, true); // Bypass cache for mutations
  }, [fetchFromSpotify]);

  const getPlaylist = useCallback(async (playlistId: string) => {
    return fetchFromSpotify(`/playlists/${playlistId}`);
  }, [fetchFromSpotify]);

  const getPlaylistTracks = useCallback(async (playlistId: string) => {
    return fetchFromSpotify(`/playlists/${playlistId}/tracks`);
  }, [fetchFromSpotify]);

  const addTracksToPlaylist = useCallback(async (playlistId: string, uris: string[]) => {
    return fetchFromSpotify(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris }),
    }, true); // Bypass cache for mutations
  }, [fetchFromSpotify]);

  // NEW: Delete a playlist from Spotify
  const deletePlaylist = useCallback(async (playlistId: string) => {
    try {
      // First, check if we can access the playlist (to verify ownership)
      await fetchFromSpotify(`/playlists/${playlistId}`, {}, true);
      
      // Spotify doesn't have a direct delete endpoint, but we can unfollow a playlist
      // which effectively removes it for the current user
      return await fetchFromSpotify(`/playlists/${playlistId}/followers`, {
        method: "DELETE"
      }, true);
    } catch (error) {
      console.error(`Failed to delete playlist ${playlistId}:`, error);
      throw error;
    }
  }, [fetchFromSpotify]);

  // Search
  const searchTracks = useCallback(async (query: string, limit: number = 20) => {
    return fetchFromSpotify(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`);
  }, [fetchFromSpotify]);

  const searchArtists = useCallback(async (query: string, limit: number = 20) => {
    return fetchFromSpotify(`/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`);
  }, [fetchFromSpotify]);

  const searchPlaylists = useCallback(async (query: string, limit: number = 20) => {
    return fetchFromSpotify(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}`);
  }, [fetchFromSpotify]);

  // Artists
  const getArtist = useCallback(async (artistId: string) => {
    return fetchFromSpotify(`/artists/${artistId}`);
  }, [fetchFromSpotify]);

  const getArtistTopTracks = useCallback(async (artistId: string, country: string = "US") => {
    return fetchFromSpotify(`/artists/${artistId}/top-tracks?market=${country}`);
  }, [fetchFromSpotify]);

  // Tracks
  const getTrack = useCallback(async (trackId: string) => {
    return fetchFromSpotify(`/tracks/${trackId}`);
  }, [fetchFromSpotify]);

  // Albums
  const getAlbum = useCallback(async (albumId: string) => {
    return fetchFromSpotify(`/albums/${albumId}`);
  }, [fetchFromSpotify]);

  const getAlbumTracks = useCallback(async (albumId: string) => {
    return fetchFromSpotify(`/albums/${albumId}/tracks`);
  }, [fetchFromSpotify]);

  // Browse
  const getFeaturedPlaylists = useCallback(async (country?: string, limit: number = 20) => {
    const countryParam = country ? `&country=${country}` : "";
    return fetchFromSpotify(`/browse/featured-playlists?limit=${limit}${countryParam}`);
  }, [fetchFromSpotify]);

  const getNewReleases = useCallback(async (country?: string, limit: number = 20) => {
    const countryParam = country ? `&country=${country}` : "";
    return fetchFromSpotify(`/browse/new-releases?limit=${limit}${countryParam}`);
  }, [fetchFromSpotify]);

  // Recommendations
  const getRecommendations = useCallback(async (options: {
    seed_artists?: string;
    seed_tracks?: string;
    seed_genres?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    
    if (options.seed_artists) params.append("seed_artists", options.seed_artists);
    if (options.seed_tracks) params.append("seed_tracks", options.seed_tracks);
    if (options.seed_genres) params.append("seed_genres", options.seed_genres);
    if (options.limit) params.append("limit", options.limit.toString());
    
    try {
      const data = await fetchFromSpotify(`/recommendations?${params.toString()}`);
      return data;
    } catch (error) {
      console.warn("Recommendations API returned error, returning empty results");
      return { tracks: [] };
    }
  }, [fetchFromSpotify]);

  return {
    fetchFromSpotify,
    safeSpotifyCall,
    getCurrentUserProfile,
    createPlaylist,
    getPlaylist,
    getPlaylistTracks,
    addTracksToPlaylist,
    deletePlaylist,
    searchTracks,
    searchArtists,
    searchPlaylists,
    getArtist,
    getArtistTopTracks,
    getTrack,
    getAlbum,
    getAlbumTracks,
    getFeaturedPlaylists,
    getNewReleases,
    getRecommendations,
    clearCache,
    isLoading,
    error,
  };
}