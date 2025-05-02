import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";
import { Alert } from "react-native";

export function useSpotifyLibrary() {
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
        // Fetch user's playlists and saved albums from Spotify API
        const [playlistsData, albumsData] = await Promise.all([
          fetchFromSpotify("/me/playlists?limit=20"),
          fetchFromSpotify("/me/albums?limit=20")
        ]);
        
        // Format playlists
        const playlists = playlistsData.items.map((playlist: any) => ({
          id: playlist.id,
          name: playlist.name,
          type: "playlist",
          owner: playlist.owner.display_name,
          imageUrl: playlist.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
        }));
        
        // Format albums
        const albums = albumsData.items.map((item: any) => {
          const album = item.album;
          return {
            id: album.id,
            name: album.name,
            type: "album",
            artist: album.artists.map((artist: any) => artist.name).join(", "),
            imageUrl: album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          };
        });
        
        // Combine playlists and albums
        const libraryItems = [...playlists, ...albums];
        
        setData(libraryItems);
      } catch (err) {
        console.error("Library fetch error:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch library"));
        
        // Show error to user
        Alert.alert(
          "Error Loading Library",
          "There was a problem loading your library. Please try again later.",
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