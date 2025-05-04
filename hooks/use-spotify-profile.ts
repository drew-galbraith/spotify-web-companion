// hooks/use-spotify-profile.ts
import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useSafeAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { db } from "../lib/firebase";
import { collection, query, where, getCountFromServer, CountSnapshot } from "firebase/firestore";

type ProfileData = {
  id: string;
  displayName: string;
  email: string;
  imageUrl: string;
  playlists: number;
  tracks: number;
  trips: number;
};

interface SpotifyProfile {
  id: string;
  display_name?: string;
  email?: string;
  images?: { url: string }[];
}

interface SpotifyPlaylistsResponse {
  total?: number;
}

interface SpotifyTracksResponse {
  total?: number;
}

export function useSpotifyProfile() {
  const { spotifyToken: token, isLoading: authLoading, isAuthenticated, user } = useSafeAuth();
  const { fetchFromSpotify } = useSpotifyApi();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      setIsLoading(false);
      setError(new Error("Not authenticated"));
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Create Firebase query to count trips for current user
        const tripsRef = collection(db, "trips");
        const q = query(tripsRef, where("userId", "==", user.id));
        
        // Fetch data in parallel
        const [userProfile, userPlaylists, userTracks, tripsSnapshot] = await Promise.all([
          fetchFromSpotify("/v1/me") as Promise<SpotifyProfile>,
          fetchFromSpotify("/v1/me/playlists?limit=1") as Promise<SpotifyPlaylistsResponse>,
          fetchFromSpotify("/v1/me/tracks?limit=1") as Promise<SpotifyTracksResponse>,
          getCountFromServer(q) as Promise<CountSnapshot>
        ]);

        // Add timeout logic separately
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        );

        try {
          await Promise.race([
            Promise.resolve(),
            timeoutPromise
          ]);
        } catch (timeoutError) {
          throw timeoutError;
        }

        // Validate data before setting state
        if (!userProfile || !userProfile.id) {
          throw new Error("Invalid profile data received");
        }

        const profileData: ProfileData = {
          id: userProfile.id,
          displayName: userProfile.display_name || "Anonymous User",
          email: userProfile.email || "",
          imageUrl: userProfile.images?.[0]?.url ?? "",
          playlists: userPlaylists?.total ?? 0,
          tracks: userTracks?.total ?? 0,
          trips: tripsSnapshot?.data().count ?? 0,
        };

        setData(profileData);
      } catch (err: any) {
        console.error("Error loading Spotify profile:", err);
        setError(err);
        
        // More specific error messages
        let errorMessage = "There was a problem loading your profile.";
        
        if (err.message.includes('timed out')) {
          errorMessage = "Request timed out. Please check your connection.";
        } else if (err.message.includes('Authentication failed')) {
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (err.message.includes('Invalid profile data')) {
          errorMessage = "Unable to load profile data. Please try again later.";
        }

        Alert.alert(
          "Error Loading Profile",
          errorMessage,
          [{ text: "OK" }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, token, isAuthenticated, user]);

  return { data, isLoading, error };
}