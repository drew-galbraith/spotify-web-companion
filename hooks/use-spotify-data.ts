import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { mockFeaturedPlaylists, mockNewReleases, mockRecentlyPlayed } from "../mocks/spotify-data";

export function useSpotifyData() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, we would fetch from Spotify API
        // For demo purposes, we'll use mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setData({
          featuredPlaylists: mockFeaturedPlaylists,
          newReleases: mockNewReleases,
          recentlyPlayed: mockRecentlyPlayed,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch data"));
        console.error("Data fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return { data, isLoading, error };
}