import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useSpotifyApi } from "@/hooks/use-spotify-api";
import { Alert } from "react-native";
import { useOpenAI } from "@/hooks/use-openai";

export function useSpotifySearch() {
  const { token } = useAuth();
  const { fetchFromSpotify, safeSpotifyCall } = useSpotifyApi();
  const { generateLocalArtists } = useOpenAI();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async (query: string, types = "track,album,playlist", limit = 20) => {
    if (!token || !query) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Search Spotify API for specified types
      const response = await fetchFromSpotify(
        `/v1/search?q=${encodeURIComponent(query)}&type=${types}&limit=${limit}`
      );
      
      let formattedResults: any[] = [];
      
      // Format tracks if included in search
      if (response.tracks) {
        const formattedTracks = response.tracks.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          type: "track",
          artist: track.artists.map((a: any) => a.name).join(", "),
          artists: track.artists.map((a: any) => a.name),
          albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          uri: track.uri, // Add URI for playlist creation
          preview_url: track.preview_url
        }));
        formattedResults = [...formattedResults, ...formattedTracks];
      }
      
      // Format albums if included in search
      if (response.albums) {
        const formattedAlbums = response.albums.items.map((album: any) => ({
          id: album.id,
          name: album.name,
          type: "album",
          artist: album.artists.map((a: any) => a.name).join(", "),
          imageUrl: album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
        }));
        formattedResults = [...formattedResults, ...formattedAlbums];
      }
      
      // Format playlists if included in search
      if (response.playlists) {
        const formattedPlaylists = response.playlists.items.map((playlist: any) => ({
          id: playlist.id,
          name: playlist.name,
          type: "playlist",
          owner: playlist.owner.display_name,
          imageUrl: playlist.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
        }));
        formattedResults = [...formattedResults, ...formattedPlaylists];
      }
      
      // Format artists if included in search
      if (response.artists) {
        const formattedArtists = response.artists.items.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          type: "artist",
          genres: artist.genres,
          popularity: artist.popularity,
          imageUrl: artist.images[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
        }));
        formattedResults = [...formattedResults, ...formattedArtists];
      }
      
      setResults(formattedResults);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err : new Error("Search failed"));
      
      // Show error to user
      Alert.alert(
        "Search Failed",
        "There was a problem with your search. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Search specifically for location-based music
  const searchLocationMusic = async (location: string, limit = 30) => {
    return search(`${location} music`, "track,artist", limit);
  };

  // Search specifically for artists from a location
  const searchLocationArtists = async (location: string, limit = 10) => {
    return search(`${location} artist`, "artist", limit);
  };

  // Get tracks from a specific country using Spotify's browse API
  const getTracksFromCountry = async (countryCode: string, limit = 20) => {
    if (!token || !countryCode) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let tracks: any[] = [];
      
      // Try multiple approaches to get country-specific music
      
      // 1. First try new releases for this country (more reliable than featured playlists)
      try {
        const newReleases = await safeSpotifyCall(
          () => fetchFromSpotify(`/v1/browse/new-releases?country=${countryCode}&limit=5`),
          { albums: { items: [] } }
        );
        
        if (newReleases.albums && newReleases.albums.items.length > 0) {
          // Get tracks from the first few albums
          for (let i = 0; i < Math.min(2, newReleases.albums.items.length); i++) {
            const albumId = newReleases.albums.items[i].id;
            const albumTracks = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/albums/${albumId}/tracks?limit=5`),
              { items: [] }
            );
            
            // Need to get full track details for each track
            for (const track of albumTracks.items.slice(0, 5)) {
              try {
                const trackDetails = await safeSpotifyCall(
                  () => fetchFromSpotify(`/v1/tracks/${track.id}`),
                  null
                );
                
                if (trackDetails) {
                  tracks.push({
                    id: trackDetails.id,
                    name: trackDetails.name,
                    type: "track",
                    artist: trackDetails.artists.map((a: any) => a.name).join(", "),
                    artists: trackDetails.artists.map((a: any) => a.name),
                    albumImageUrl: trackDetails.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                    uri: trackDetails.uri,
                    preview_url: trackDetails.preview_url
                  });
                }
              } catch (err) {
                console.log(`Error getting details for track ${track.id}:`, err);
              }
            }
          }
          console.log(`Got tracks from albums in ${countryCode}`);
        }
      } catch (err) {
        console.log("Error getting tracks from new releases:", err);
        // Continue with other methods
      }
      
      // 2. Try featured playlists for this country
      if (tracks.length < 10) {
        try {
          // Try country-specific featured playlists first
          try {
            const featuredPlaylists = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/browse/featured-playlists?country=${countryCode}&limit=2`),
              { playlists: { items: [] } }
            );
            
            if (featuredPlaylists.playlists && featuredPlaylists.playlists.items.length > 0) {
              // Get tracks from the first featured playlist
              const playlistId = featuredPlaylists.playlists.items[0].id;
              const playlistTracks = await safeSpotifyCall(
                () => fetchFromSpotify(`/v1/playlists/${playlistId}/tracks?limit=10`),
                { items: [] }
              );
              
              const playlistItems = playlistTracks.items
                .filter((item: any) => item.track)
                .map((item: any) => {
                  const track = item.track;
                  return {
                    id: track.id,
                    name: track.name,
                    type: "track",
                    artist: track.artists.map((a: any) => a.name).join(", "),
                    artists: track.artists.map((a: any) => a.name),
                    albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                    uri: track.uri,
                    preview_url: track.preview_url
                  };
                });
              
              tracks.push(...playlistItems);
              console.log(`Got ${playlistItems.length} tracks from featured playlist in ${countryCode}`);
            }
          } catch (err) {
            console.log(`Error getting featured playlists for country ${countryCode}:`, err);
          }
          
          // If country-specific featured playlists failed, try global ones
          if (tracks.length < 10) {
            const globalFeaturedPlaylists = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/browse/featured-playlists?limit=2`),
              { playlists: { items: [] } }
            );
            
            if (globalFeaturedPlaylists.playlists && globalFeaturedPlaylists.playlists.items.length > 0) {
              // Get tracks from the first featured playlist
              const playlistId = globalFeaturedPlaylists.playlists.items[0].id;
              const playlistTracks = await safeSpotifyCall(
                () => fetchFromSpotify(`/v1/playlists/${playlistId}/tracks?limit=10`),
                { items: [] }
              );
              
              const playlistItems = playlistTracks.items
                .filter((item: any) => item.track)
                .map((item: any) => {
                  const track = item.track;
                  return {
                    id: track.id,
                    name: track.name,
                    type: "track",
                    artist: track.artists.map((a: any) => a.name).join(", "),
                    artists: track.artists.map((a: any) => a.name),
                    albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                    uri: track.uri,
                    preview_url: track.preview_url
                  };
                });
              
              tracks.push(...playlistItems);
              console.log(`Got ${playlistItems.length} tracks from global featured playlist`);
            }
          }
        } catch (err) {
          console.log("Error getting tracks from featured playlists:", err);
        }
      }
      
      // 3. If we still don't have enough tracks, try global charts
      if (tracks.length < 10) {
        try {
          // Search for global top charts playlists
          const chartsSearch = await safeSpotifyCall(
            () => fetchFromSpotify(`/v1/search?q=top%20global%20charts&type=playlist&limit=1`),
            { playlists: { items: [] } }
          );
          
          if (chartsSearch.playlists && chartsSearch.playlists.items.length > 0) {
            const chartPlaylistId = chartsSearch.playlists.items[0].id;
            const chartTracks = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/playlists/${chartPlaylistId}/tracks?limit=10`),
              { items: [] }
            );
            
            const chartItems = chartTracks.items
              .filter((item: any) => item.track)
              .map((item: any) => {
                const track = item.track;
                return {
                  id: track.id,
                  name: track.name,
                  type: "track",
                  artist: track.artists.map((a: any) => a.name).join(", "),
                  artists: track.artists.map((a: any) => a.name),
                  albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                  uri: track.uri,
                  preview_url: track.preview_url
                };
              });
            
            tracks.push(...chartItems);
            console.log(`Added ${chartItems.length} tracks from global charts`);
          }
        } catch (err) {
          console.log("Error getting tracks from global charts:", err);
        }
      }
      
      // Remove duplicates
      const uniqueTracks = Array.from(
        new Map(tracks.map((track: any) => [track.id, track])).values()
      );
      
      setResults(uniqueTracks);
      return uniqueTracks;
    } catch (err) {
      console.error("Error getting tracks from country:", err);
      setError(err instanceof Error ? err : new Error("Failed to get tracks from country"));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Find artists from a specific location using OpenAI and Spotify
  const findLocalArtists = async (location: string, countryCode: string = "US") => {
    if (!token) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to get artists from OpenAI
      const aiArtists = await generateLocalArtists(location, countryCode, 10);
      console.log(`Generated ${aiArtists.length} AI artists for ${location}`);
      
      // If we found artists via OpenAI, get their details from Spotify
      if (aiArtists.length > 0) {
        const spotifyArtists = await Promise.all(
          aiArtists.slice(0, 10).map(async (aiArtist: any) => {
            try {
              // Search for this artist on Spotify
              const searchResponse = await safeSpotifyCall(
                () => fetchFromSpotify(`/v1/search?q=${encodeURIComponent(aiArtist.name)}&type=artist&limit=1`),
                { artists: { items: [] } }
              );
              
              // If we found a match on Spotify
              if (searchResponse.artists.items.length > 0) {
                const spotifyArtist = searchResponse.artists.items[0];
                
                // Get full artist details from Spotify
                const artistDetails = await safeSpotifyCall(
                  () => fetchFromSpotify(`/v1/artists/${spotifyArtist.id}`),
                  null
                );
                
                if (!artistDetails) {
                  // If we couldn't get details, return basic info
                  return {
                    id: spotifyArtist.id,
                    name: spotifyArtist.name,
                    type: "artist",
                    imageUrl: spotifyArtist.images?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
                    popularity: spotifyArtist.popularity,
                    genres: spotifyArtist.genres || [],
                    aiGenerated: true,
                    aiDescription: aiArtist.description,
                    aiFamousLevel: aiArtist.famousLevel
                  };
                }
                
                return {
                  id: artistDetails.id,
                  name: artistDetails.name,
                  type: "artist",
                  imageUrl: artistDetails.images[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
                  popularity: artistDetails.popularity,
                  genres: artistDetails.genres,
                  followers: artistDetails.followers?.total,
                  spotifyUrl: artistDetails.external_urls?.spotify,
                  aiGenerated: true,
                  aiDescription: aiArtist.description,
                  aiFamousLevel: aiArtist.famousLevel
                };
              }
              
              // If no match on Spotify, return null to filter out later
              return null;
            } catch (err) {
              console.log(`Error getting details for AI artist ${aiArtist.name}:`, err);
              return null;
            }
          })
        );
        
        // Filter out null results and sort by popularity
        const validSpotifyArtists = spotifyArtists
          .filter(artist => artist !== null)
          .sort((a, b) => (b?.popularity || 0) - (a?.popularity || 0));
        
        if (validSpotifyArtists.length > 0) {
          console.log(`Found ${validSpotifyArtists.length} Spotify artists from AI data`);
          setResults(validSpotifyArtists);
          return validSpotifyArtists;
        }
      }
      
      // If OpenAI didn't yield results, fall back to Spotify search
      let artists: any[] = [];
      const locationParts = location.split(',');
      const city = locationParts[0].trim();
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : city;
      
      // Strategy 1: Try to get artists from new releases in the country
      try {
        const newReleases = await safeSpotifyCall(
          () => fetchFromSpotify(`/v1/browse/new-releases?country=${countryCode}&limit=10`),
          { albums: { items: [] } }
        );
        
        if (newReleases.albums && newReleases.albums.items.length > 0) {
          const releaseArtists = newReleases.albums.items
            .flatMap((album: any) => album.artists)
            .filter((artist: any, index: number, self: any[]) => 
              index === self.findIndex((a: any) => a.id === artist.id)
            );
          
          artists = [...artists, ...releaseArtists];
          console.log(`Found ${releaseArtists.length} artists from new releases in ${countryCode}`);
        }
      } catch (err) {
        console.log("Error getting artists from new releases:", err);
      }
      
      // Strategy 2: Search for artists with the city or country name
      if (artists.length < 5) {
        try {
          // First try with city name
          const citySearch = await safeSpotifyCall(
            () => fetchFromSpotify(`/v1/search?q=${encodeURIComponent(city)}&type=artist&limit=10`),
            { artists: { items: [] } }
          );
          
          if (citySearch.artists && citySearch.artists.items.length > 0) {
            artists = [...artists, ...citySearch.artists.items];
          }
          
          // If still not enough, try with country name
          if (artists.length < 5 && country !== city) {
            const countrySearch = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/search?q=${encodeURIComponent(country)}&type=artist&limit=10`),
              { artists: { items: [] } }
            );
            
            if (countrySearch.artists && countrySearch.artists.items.length > 0) {
              artists = [...artists, ...countrySearch.artists.items];
            }
          }
        } catch (err) {
          console.log("Error searching for artists by location name:", err);
        }
      }
      
      // Strategy 3: Try to get artists from featured playlists in the country
      if (artists.length < 5) {
        try {
          // Try global featured playlists if country-specific ones fail
          const featuredPlaylists = await safeSpotifyCall(
            () => fetchFromSpotify(`/v1/browse/featured-playlists?limit=2`),
            { playlists: { items: [] } }
          );
          
          if (featuredPlaylists.playlists && featuredPlaylists.playlists.items.length > 0) {
            // Get tracks from the first featured playlist
            const playlistId = featuredPlaylists.playlists.items[0].id;
            const playlistTracks = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/playlists/${playlistId}/tracks?limit=20`),
              { items: [] }
            );
            
            // Extract unique artists from the tracks
            const playlistArtists = playlistTracks.items
              .filter((item: any) => item.track && item.track.artists)
              .flatMap((item: any) => item.track.artists)
              .filter((artist: any, index: number, self: any[]) => 
                index === self.findIndex((a: any) => a.id === artist.id)
              );
            
            artists = [...artists, ...playlistArtists];
          }
        } catch (err) {
          console.log("Error getting artists from featured playlists:", err);
        }
      }
      
      // Remove duplicates and get the top artists by popularity
      const uniqueArtists = Array.from(
        new Map(artists.map((artist: any) => [artist.id, artist])).values()
      );
      
      // Get detailed info for top artists
      const topArtists = uniqueArtists.slice(0, 10);
      const detailedArtists = await Promise.all(
        topArtists.map(async (artist: any) => {
          try {
            // Get full artist details
            const artistDetails = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/artists/${artist.id}`),
              null
            );
            
            if (!artistDetails) {
              // Return basic info if detailed fetch fails
              return {
                id: artist.id,
                name: artist.name,
                type: "artist",
                imageUrl: artist.images?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
                popularity: artist.popularity,
                genres: artist.genres || []
              };
            }
            
            return {
              id: artistDetails.id,
              name: artistDetails.name,
              type: "artist",
              imageUrl: artistDetails.images[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
              popularity: artistDetails.popularity,
              genres: artistDetails.genres,
              followers: artistDetails.followers?.total,
              spotifyUrl: artistDetails.external_urls?.spotify
            };
          } catch (err) {
            console.log(`Error getting details for artist ${artist.name}:`, err);
            // Return basic info if detailed fetch fails
            return {
              id: artist.id,
              name: artist.name,
              type: "artist",
              imageUrl: artist.images?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D",
              popularity: artist.popularity,
              genres: artist.genres || []
            };
          }
        })
      );
      
      // Sort by popularity
      const sortedArtists = detailedArtists.sort((a, b) => 
        (b.popularity || 0) - (a.popularity || 0)
      );
      
      console.log(`Returning ${sortedArtists.length} detailed local artists`);
      setResults(sortedArtists);
      return sortedArtists;
    } catch (err) {
      console.error("Error finding local artists:", err);
      setError(err instanceof Error ? err : new Error("Failed to find local artists"));
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    results, 
    isLoading, 
    error, 
    search,
    searchLocationMusic,
    searchLocationArtists,
    getTracksFromCountry,
    findLocalArtists
  };
}