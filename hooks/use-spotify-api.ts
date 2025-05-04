import { useState, useCallback } from "react";
import { useSafeAuth } from "../context/auth-context";

export function useSpotifyApi() {
  const { spotifyToken } = useSafeAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromSpotify = useCallback(async (endpoint: string, options: RequestInit = {}, bypassCache: boolean = false) => {
    if (!spotifyToken) {
      throw new Error('Not authenticated with Spotify');
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com${endpoint}`;
      
      console.log(`Fetching from Spotify: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Spotify API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error in fetchFromSpotify:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch from Spotify");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [spotifyToken]);

  // Safe Spotify call helper function
  const safeSpotifyCall = async (apiCall: () => Promise<any>, fallback: any = null) => {
    try {
      return await apiCall();
    } catch (error) {
      console.error("Spotify API error:", error);
      return fallback;
    }
  };

  return {
    fetchFromSpotify,
    isLoading,
    error,
    safeSpotifyCall
  };
}