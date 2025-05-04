
// hooks/use-spotify-profile.ts
import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useSafeAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { supabase } from "../hooks/supabase";

type ProfileData = {
  id: string;
  displayName: string;
  email: string;
  imageUrl: string;
  playlists: number;
  tracks: number;
  trips: number;
};

export function useSpotifyProfile() {
  const { spotifyToken: token, isLoading: authLoading } = useSafeAuth();
  const { fetchFromSpotify } = useSpotifyApi();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Parallel fetch: Spotify profile, playlists count, tracks count, and Supabase trips count
        const [userProfile, userPlaylists, userTracks, tripsRes] = await Promise.all([
          fetchFromSpotify("/me"),
          fetchFromSpotify("/me/playlists?limit=1"),
          fetchFromSpotify("/me/tracks?limit=1"),
          supabase
            .from("trips")
            .select("id", { count: "exact", head: true })
        ]);

        const profileData: ProfileData = {
          id: userProfile.id,
          displayName: userProfile.display_name,
          email: userProfile.email,
          imageUrl: userProfile.images?.[0]?.url ?? "",
          playlists: userPlaylists.total ?? 0,
          tracks: userTracks.total ?? 0,
          trips: tripsRes.count ?? 0,
        };

        setData(profileData);
      } catch (err: any) {
        console.error("Error loading Spotify profile:", err);
        setError(err);
        Alert.alert(
          "Error Loading Profile",
          "There was a problem loading your profile. Please try again later.",
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && token) {
      fetchData();
    } else if (!authLoading && !token) {
      setIsLoading(false);
      setError(new Error("Not authenticated"));
    }
  }, [authLoading, token]);

  return { data, isLoading, error };
}
