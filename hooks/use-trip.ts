import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface TripData {
  id: string;
  userId: string;
  playlists: any[];
  [key: string]: any;
}

export function useTrip(id: string | undefined) {
  const { user } = useAuth();
  const spotifyApi = useSpotifyApi();
  const [data, setData] = useState<TripData | null>(null);
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
    if (!user || !tripIdRef.current || !spotifyApi.fetchFromSpotify) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get trip from Firebase
      const tripDoc = await getDoc(doc(db, "trips", tripIdRef.current));
      
      if (!tripDoc.exists()) {
        throw new Error("Trip not found");
      }
      
      const trip: TripData = {
        id: tripDoc.id,
        ...tripDoc.data()
      } as TripData;
      
      // Verify this trip belongs to the current user
      if (trip.userId !== user.id) {
        throw new Error("Unauthorized access to trip");
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
              
              try {
                const tracksResponse = await spotifyApi.fetchFromSpotify(
                  `/playlists/${playlist.id}/tracks?limit=5`
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
                clearTimeout(timeoutId);
                return {
                  ...playlist,
                  tracks: []
                };
              }
            } catch (err) {
              console.error("Error with controller", err);
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
  }, [user, spotifyApi]);

  useEffect(() => {
    // Only load data on initial mount or when tripId changes
    if (isInitialLoadRef.current || id !== tripIdRef.current) {
      isInitialLoadRef.current = false;
      loadData();
    }
  }, [loadData, id]);

  return { data, isLoading, error, refetch: loadData };
}