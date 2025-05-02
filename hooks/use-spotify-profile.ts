import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { Alert } from "react-native";

export function useSpotifyProfile() {
  const { token } = useAuth();
  const { fetchFromSpotify } = useSpotifyApi();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch user profile from Spotify API
        const userProfile = await fetchFromSpotify("/me");
        
        // Fetch user's playlists to get count
        const userPlaylists = await fetchFromSpotify("/me/playlists?limit=1");
        
        // Transform Spotify API data to match our app's format
        const profileData = {
          id: userProfile.id,
          displayName: userProfile.display_name,
          email: userProfile.email,
          imageUrl: userProfile.images?.[0]?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
          followers: userProfile.followers?.total || 0,
          // Add travel-specific data
          trips: 3, // Mock data since we don't have a real trips API
          playlists: userPlaylists.total || 0,
          tracks: 127, // Mock data since getting exact track count would require multiple API calls
        };
        
        setData(profileData);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch profile"));
        
        // Show error to user
        Alert.alert(
          "Error Loading Profile",
          "There was a problem loading your Spotify profile. Please try again later.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return { data, isLoading, error };
}