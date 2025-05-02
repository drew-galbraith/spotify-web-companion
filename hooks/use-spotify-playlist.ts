import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { Alert } from "react-native";

export function useSpotifyPlaylist(id: string | undefined) {
  const { token } = useAuth();
  const spotifyApi = useSpotifyApi();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to track if this is the initial load and the current playlist ID
  const isInitialLoadRef = useRef(true);
  const playlistIdRef = useRef(id);

  // Update the ref when the ID changes
  useEffect(() => {
    playlistIdRef.current = id;
  }, [id]);

  const fetchData = useCallback(async () => {
    if (!token || !playlistIdRef.current || !spotifyApi.fetchFromSpotify) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch playlist and its tracks from Spotify API
      const playlistData = await spotifyApi.fetchFromSpotify(`/playlists/${playlistIdRef.current}`);
      
      // Fetch tracks in batches to avoid rate limiting
      let allTracks: any[] = [];
      let offset = 0;
      const limit = 20; // Reduced from 50 to avoid rate limiting
      let hasMoreTracks = true;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (hasMoreTracks && retryCount < maxRetries) {
        try {
          const tracksResponse = await spotifyApi.fetchFromSpotify(
            `/playlists/${playlistIdRef.current}/tracks?offset=${offset}&limit=${limit}`
          );
          
          if (!tracksResponse || !tracksResponse.items) {
            console.warn("Invalid tracks response:", tracksResponse);
            break;
          }
          
          const formattedTracks = tracksResponse.items
            .filter((item: any) => item.track) // Filter out null tracks
            .map((item: any) => {
              const track = item.track;
              return {
                id: track.id,
                name: track.name,
                artists: track.artists.map((artist: any) => artist.name),
                album: track.album.name,
                albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                duration_ms: track.duration_ms,
                preview_url: track.preview_url,
                uri: track.uri, // Add Spotify URI for full track playback
              };
            });
          
          allTracks = [...allTracks, ...formattedTracks];
          
          // Check if there are more tracks
          offset += limit;
          hasMoreTracks = tracksResponse.items.length === limit && offset < tracksResponse.total;
          
          // Add a larger delay to avoid rate limiting
          if (hasMoreTracks) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Reset retry count on success
          retryCount = 0;
        } catch (error) {
          console.error("Error fetching playlist tracks batch:", error);
          retryCount++;
          
          // Add exponential backoff
          if (retryCount < maxRetries) {
            const backoffTime = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying in ${backoffTime}ms (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          } else {
            // If we've reached max retries, break the loop but continue with what we have
            console.warn("Max retries reached, continuing with partial track list");
            hasMoreTracks = false;
          }
        }
      }
      
      // If we have no tracks but should have some, show a warning
      if (allTracks.length === 0 && playlistData.tracks?.total > 0) {
        console.warn("Could not fetch any tracks for playlist with", playlistData.tracks.total, "tracks");
      }
      
      // Calculate total duration
      const totalDurationMs = allTracks.reduce((total: number, track: any) => total + track.duration_ms, 0);
      const hours = Math.floor(totalDurationMs / 3600000);
      const minutes = Math.floor((totalDurationMs % 3600000) / 60000);
      const duration = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
      
      // Format playlist data
      const formattedPlaylist = {
        id: playlistData.id,
        name: playlistData.name,
        description: playlistData.description,
        owner: playlistData.owner.display_name,
        imageUrl: playlistData.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
        tracks: allTracks,
        trackCount: playlistData.tracks?.total || allTracks.length,
        duration,
        dominantColor: "#1E1E1E", // Default color
        uri: playlistData.uri, // Add Spotify URI for opening in Spotify
        // Add travel-specific data (mock since we don't have real travel data)
        destination: "Your Favorite Places",
      };
      
      setData(formattedPlaylist);
    } catch (err) {
      console.error("Playlist fetch error:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch playlist"));
      
      // Show error to user
      Alert.alert(
        "Error Loading Playlist",
        "There was a problem loading this playlist. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, spotifyApi.fetchFromSpotify]);

  useEffect(() => {
    // Only fetch data on initial mount or when playlistId changes
    if (isInitialLoadRef.current || id !== playlistIdRef.current) {
      isInitialLoadRef.current = false;
      fetchData();
    }
  }, [fetchData, id]);

  return { data, isLoading, error, refetch: fetchData };
}