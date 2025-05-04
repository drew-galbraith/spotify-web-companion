import { useState, useEffect } from "react";
import { useSafeAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { Alert } from "react-native";

export function useSpotifyAlbum(id: string | undefined) {
  const { token } = useSafeAuth();
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
        // Fetch album and its tracks from Spotify API
        const [albumData, albumTracksData] = await Promise.all([
          fetchFromSpotify(`/albums/${id}`),
          fetchFromSpotify(`/albums/${id}/tracks?limit=50`)
        ]);
        
        // Format tracks
        const tracks = albumTracksData.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist: any) => artist.name),
          album: albumData.name,
          albumImageUrl: albumData.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          duration_ms: track.duration_ms,
        }));
        
        // Calculate total duration
        const totalDurationMs = tracks.reduce((total: number, track: any) => total + track.duration_ms, 0);
        const hours = Math.floor(totalDurationMs / 3600000);
        const minutes = Math.floor((totalDurationMs % 3600000) / 60000);
        const duration = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
        
        // Format album data
        const formattedAlbum = {
          id: albumData.id,
          name: albumData.name,
          artists: albumData.artists.map((artist: any) => artist.name),
          imageUrl: albumData.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          releaseDate: albumData.release_date,
          tracks,
          duration,
          dominantColor: "#1E1E1E", // Default color
          artistImageUrl: albumData.artists[0]?.images?.[0]?.url || albumData.images[0]?.url,
        };
        
        setData(formattedAlbum);
      } catch (err) {
        console.error("Album fetch error:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch album"));
        
        // Show error to user
        Alert.alert(
          "Error Loading Album",
          "There was a problem loading this album. Please try again later.",
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