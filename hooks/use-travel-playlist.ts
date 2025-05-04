import { useState, useEffect } from "react";
import { useSafeAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { Alert } from "react-native";
import { getAuth } from 'firebase/auth';

export function useTravelPlaylist(id: string | undefined) {
  const { user } = useSafeAuth(); // Changed from token to user
  const { fetchFromSpotify } = useSpotifyApi();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !id) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch playlist data from Spotify API
        const playlistData = await fetchFromSpotify(`/playlists/${id}`);
        
        // Fetch tracks separately to avoid issues with large playlists
        let allTracks: any[] = [];
        let nextUrl = playlistData.tracks.href;
        
        while (nextUrl) {
          // Extract the endpoint part from the full URL
          const endpoint = nextUrl.replace('https://api.spotify.com/v1', '');
          const tracksResponse = await fetchFromSpotify(endpoint);
          
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
          nextUrl = tracksResponse.next;
          
          // If there are more tracks, add a small delay to avoid rate limiting
          if (nextUrl) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // Calculate total duration
        const totalDurationMs = allTracks.reduce((total: number, track: any) => total + track.duration_ms, 0);
        const hours = Math.floor(totalDurationMs / 3600000);
        const minutes = Math.floor((totalDurationMs % 3600000) / 60000);
        const duration = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
        
        // Extract destination from playlist name or description
        let destination = "Your Journey";
        let mood = "Relaxing";
        let travelType = "Road Trip";
        
        // Try to extract destination from playlist name
        const nameMatch = playlistData.name.match(/(.+?)\s+Vibes/i);
        if (nameMatch) {
          destination = nameMatch[1];
        }
        
        // Try to extract more info from description
        if (playlistData.description) {
          // Look for destination in description
          const destMatch = playlistData.description.match(/trip to\s+(.+?)[\.,$]/i);
          if (destMatch) {
            destination = destMatch[1];
          }
          
          // Look for mood indicators
          const moodKeywords = {
            "relax": "Relaxing",
            "chill": "Chill",
            "energetic": "Energetic",
            "party": "Party",
            "romantic": "Romantic",
            "adventure": "Adventure"
          };
          
          for (const [keyword, moodValue] of Object.entries(moodKeywords)) {
            if (playlistData.description.toLowerCase().includes(keyword)) {
              mood = moodValue;
              break;
            }
          }
          
          // Look for travel type indicators
          const travelKeywords = {
            "road trip": "Road Trip",
            "flight": "Flight",
            "beach": "Beach Vacation",
            "hiking": "Hiking Trip",
            "city": "City Exploration",
            "backpack": "Backpacking"
          };
          
          for (const [keyword, typeValue] of Object.entries(travelKeywords)) {
            if (playlistData.description.toLowerCase().includes(keyword)) {
              travelType = typeValue;
              break;
            }
          }
        }
        
        // Format playlist data
        const formattedPlaylist = {
          id: playlistData.id,
          name: playlistData.name,
          description: playlistData.description || "A perfect soundtrack for your travels",
          owner: playlistData.owner.display_name,
          imageUrl: playlistData.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          tracks: allTracks,
          trackCount: allTracks.length,
          duration,
          uri: playlistData.uri, // Add Spotify URI for opening in Spotify
          // Travel-specific data
          destination,
          location: destination, // For compatibility with UI
          mood,
          travelType
        };
        
        setData(formattedPlaylist);
      } catch (err) {
        console.error("Travel playlist fetch error:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch playlist"));
        
        // Show error to user
        Alert.alert(
          "Error Loading Playlist",
          "There was a problem loading this travel playlist. Please try again later.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, id]); // Changed dependency from token to user

  return { data, isLoading, error };
}