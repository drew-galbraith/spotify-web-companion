import { useState, useEffect, useCallback, useRef } from "react";
import { useSafeAuth } from "../context/auth-context";
import { useSpotifyApi } from "./use-spotify-api";

export function useSpotifyStats() {
  const { token } = useSafeAuth();
  const spotifyApi = useSpotifyApi();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to track if this is the initial load
  const isInitialLoadRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!token || !spotifyApi.fetchFromSpotify) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch user profile first
      const userProfile = await spotifyApi.getCurrentUserProfile();
      
      // Fetch user's top items and recently played tracks
      const [
        topTracksShortTerm,
        topArtistsShortTerm,
        recentlyPlayed
      ] = await Promise.all([
        spotifyApi.fetchFromSpotify("/me/top/tracks?time_range=short_term&limit=10"),
        spotifyApi.fetchFromSpotify("/me/top/artists?time_range=short_term&limit=10"),
        spotifyApi.fetchFromSpotify("/me/player/recently-played?limit=20")
      ]);
      
      // Process top tracks
      const processTopTracks = (tracks: any) => {
        if (!tracks || !tracks.items) return [];
        
        return tracks.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((artist: any) => artist.name).join(", "),
          imageUrl: track.album.images[0]?.url || "",
          popularity: track.popularity,
          uri: track.uri,
          preview_url: track.preview_url
        }));
      };
      
      // Process top artists
      const processTopArtists = (artists: any) => {
        if (!artists || !artists.items) return [];
        
        return artists.items.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          imageUrl: artist.images[0]?.url || "",
          genres: artist.genres,
          popularity: artist.popularity,
          uri: artist.uri
        }));
      };
      
      // Process recently played
      const processRecentlyPlayed = (tracks: any) => {
        if (!tracks || !tracks.items) return [];
        
        return tracks.items.map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists.map((artist: any) => artist.name).join(", "),
          imageUrl: item.track.album.images[0]?.url || "",
          playedAt: item.played_at,
          uri: item.track.uri,
          preview_url: item.track.preview_url
        }));
      };
      
      // Extract genres from top artists
      const extractGenres = (artists: any[]) => {
        if (!artists || artists.length === 0) return [];
        
        const genreCounts: Record<string, number> = {};
        
        artists.forEach(artist => {
          if (artist.genres && artist.genres.length > 0) {
            artist.genres.forEach((genre: string) => {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
          }
        });
        
        // Sort genres by count
        const sortedGenres = Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([genre, count]) => ({
            name: genre,
            count
          }));
        
        return sortedGenres;
      };
      
      // Calculate listening stats
      const calculateListeningStats = (tracks: any[], recentlyPlayed: any[]) => {
        // Count unique artists
        const uniqueArtists = new Set();
        
        // Process tracks
        if (tracks && tracks.length > 0) {
          tracks.forEach(track => {
            if (track.artist) {
              track.artist.split(", ").forEach((artist: string) => uniqueArtists.add(artist));
            }
          });
        }
        
        // Process recently played
        if (recentlyPlayed && recentlyPlayed.length > 0) {
          recentlyPlayed.forEach(track => {
            if (track.artist) {
              track.artist.split(", ").forEach((artist: string) => uniqueArtists.add(artist));
            }
          });
        }
        
        // Calculate average popularity
        const totalPopularity = tracks.reduce((sum, track) => sum + (track.popularity || 0), 0);
        const averagePopularity = tracks.length > 0 ? Math.round(totalPopularity / tracks.length) : 0;
        
        // Estimate listening time (mock data since we don't have real listening time)
        const listeningTime = Math.floor(Math.random() * 300) + 100; // Random minutes between 100-400
        
        return {
          uniqueArtistsCount: uniqueArtists.size,
          tracksCount: tracks.length + recentlyPlayed.length,
          averagePopularity,
          listeningTime
        };
      };
      
      // Process the data
      const processedTopTracks = processTopTracks(topTracksShortTerm);
      const processedTopArtists = processTopArtists(topArtistsShortTerm);
      const processedRecentlyPlayed = processRecentlyPlayed(recentlyPlayed);
      const processedGenres = extractGenres(topArtistsShortTerm?.items || []);
      const stats = calculateListeningStats(processedTopTracks, processedRecentlyPlayed);
      
      // Format the data
      const formattedData = {
        user: {
          id: userProfile.id,
          displayName: userProfile.display_name,
          imageUrl: userProfile.images?.[0]?.url,
          country: userProfile.country,
          product: userProfile.product
        },
        topTracks: {
          shortTerm: processedTopTracks,
        },
        topArtists: {
          shortTerm: processedTopArtists,
        },
        recentlyPlayed: processedRecentlyPlayed,
        genres: {
          shortTerm: processedGenres,
        },
        stats: {
          shortTerm: stats,
        }
      };
      
      setData(formattedData);
    } catch (err) {
      console.error("Stats fetch error:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch stats"));
    } finally {
      setIsLoading(false);
    }
  }, [token, spotifyApi]);

  useEffect(() => {
    // Only fetch data on initial mount
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      fetchData();
    }
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}