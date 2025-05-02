import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/auth-context";
import { useTripStore } from "../store/trip-store";
import { useSpotifyApi } from "./use-spotify-api";

export function useTrip(id: string | undefined) {
  const { token } = useAuth();
  const spotifyApi = useSpotifyApi();
  const getTripById = useTripStore((state) => state.getTripById);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to track if this is the initial load and the current trip ID
  const isInitialLoadRef = useRef(true);
  const tripIdRef = useRef(id);

  // Update the ref when the ID changes
  useEffect(() => {
    tripIdRef.current = id;
  }, [id]);

  const loadData = useCallback(async () => {
    if (!token || !tripIdRef.current || !spotifyApi.fetchFromSpotify) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get trip from store
      const trip = getTripById(tripIdRef.current);
      
      if (!trip) {
        throw new Error("Trip not found");
      }
      
      // If the trip has playlists, fetch the first few tracks for each playlist
      if (trip.playlists && trip.playlists.length > 0) {
        const enhancedPlaylists = await Promise.all(
          trip.playlists.map(async (playlist: any) => {
            // If we already have tracks, don't fetch them again
            if (playlist.tracks && playlist.tracks.length > 0) {
              return playlist;
            }
            
            try {
              // Fetch up to 5 tracks for the playlist preview with a timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
              const tracksResponse = await spotifyApi.safeSpotifyCall(
                () => spotifyApi.fetchFromSpotify(
                  `/playlists/${playlist.id}/tracks?limit=5`
                ),
                { items: [] }
              );
              
              clearTimeout(timeoutId);
              
              if (tracksResponse && tracksResponse.items) {
                const tracks = tracksResponse.items
                  .filter((item: any) => item.track)
                  .map((item: any) => ({
                    id: item.track.id,
                    name: item.track.name,
                    artists: item.track.artists.map((artist: any) => artist.name),
                    albumName: item.track.album.name,
                    albumImageUrl: item.track.album.images[0]?.url || '',
                    duration_ms: item.track.duration_ms,
                    preview_url: item.track.preview_url,
                    uri: item.track.uri
                  }));
                
                return {
                  ...playlist,
                  tracks
                };
              }
              
              return playlist;
            } catch (err) {
              console.error("Error fetching playlist tracks:", err);
              // Return the playlist without tracks if there's an error
              return {
                ...playlist,
                tracks: []
              };
            }
          })
        );
        
        setData({
          ...trip,
          playlists: enhancedPlaylists
        });
      } else {
        setData(trip);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch trip"));
      console.error("Trip fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, getTripById, spotifyApi]);

  useEffect(() => {
    // Only load data on initial mount or when tripId changes
    if (isInitialLoadRef.current || id !== tripIdRef.current) {
      isInitialLoadRef.current = false;
      loadData();
    }
  }, [loadData, id]);

  return { data, isLoading, error, refetch: loadData };
}