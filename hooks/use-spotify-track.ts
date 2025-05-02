import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { Alert } from "react-native";

export function useSpotifyTrack(id: string | undefined) {
  const { token } = useAuth();
  const { fetchFromSpotify } = useSpotifyApi();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch track data from Spotify API
        const track = await fetchFromSpotify(`/tracks/${id}`);
        
        // Log the preview URL for debugging
        console.log(`Track ${id} preview URL:`, track.preview_url);
        
        // Format the track data
        const formattedTrack = {
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist: any) => artist.name),
          album: track.album.name,
          albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          uri: track.uri, // Add Spotify URI for full track playback
          popularity: track.popularity,
          releaseDate: track.album.release_date,
        };
        
        setData(formattedTrack);
      } catch (err) {
        console.error("Track fetch error:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch track"));
        
        // Show error to user
        Alert.alert(
          "Error Loading Track",
          "There was a problem loading this track. Please try again later.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, id]);

  return { data, isLoading, error };
}