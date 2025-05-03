import { useState } from "react";
import { useSpotifyApi } from "./use-spotify-api";

export const useSpotifySearch = () => {
  const { fetchFromSpotify, safeSpotifyCall } = useSpotifyApi();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await safeSpotifyCall(
        () => fetchFromSpotify(`search?q=${encodeURIComponent(query)}&type=track,artist,album,playlist&limit=20`),
        { tracks: { items: [] }, artists: { items: [] }, albums: { items: [] }, playlists: { items: [] } }
      );

      const tracks = response?.tracks?.items?.map((track: any) => ({
        id: track.id,
        name: track.name,
        type: "track",
        artist: track.artists.map((a: any) => a.name).join(", "),
        artists: track.artists.map((a: any) => a.name),
        albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
        uri: track.uri,
        preview_url: track.preview_url,
      })) || [];

      const artists = response?.artists?.items?.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        type: "artist",
        imageUrl: artist.images[0]?.url || "https://images.unsplash.com/photo-1517230878791-4d686b3fb427?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8YXJ0aXN0fGVufDB8fDB8fHww",
        uri: artist.uri,
      })) || [];

      const albums = response?.albums?.items?.map((album: any) => ({
        id: album.id,
        name: album.name,
        type: "album",
        artist: album.artists.map((a: any) => a.name).join(", "),
        imageUrl: album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fDB8fHww",
        uri: album.uri,
      })) || [];

      const playlists = response?.playlists?.items?.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        type: "playlist",
        description: playlist.description,
        imageUrl: playlist.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fDB8fHww",
        uri: playlist.uri,
      })) || [];

      setResults([...tracks, ...artists, ...albums, ...playlists]);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchLocationMusic = async (destination: string) => {
    const tracks: any[] = [];
    const searchTerms = [
      `${destination} music`,
      `${destination} traditional music`,
      `${destination} popular music`,
    ];

    for (const term of searchTerms) {
      try {
        console.log(`Searching Spotify for playlists: ${term}`);
        const response = await safeSpotifyCall(
          () => fetchFromSpotify(`search?q=${encodeURIComponent(term)}&type=playlist&limit=3`),
          { playlists: { items: [] } }
        );

        if (response?.playlists?.items?.length > 0 && response.playlists.items[0]) {
          const playlist = response.playlists.items[0];
          console.log(`Fetching tracks for playlist: ${playlist.name} (${playlist.id})`);
          const playlistTracks = await safeSpotifyCall(
            () => fetchFromSpotify(`playlists/${playlist.id}/tracks?limit=15`),
            { items: [] }
          );

          if (playlistTracks?.items) {
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
                  preview_url: track.preview_url,
                };
              });

            tracks.push(...playlistItems);
            console.log(`Got ${playlistItems.length} tracks from country playlist "${playlist.name}"`);
          } else {
            console.log(`No tracks found for playlist: ${playlist.name}`);
          }
        } else {
          console.log(`No playlists found for search term: ${term}`);
        }
      } catch (error) {
        console.error(`Error getting tracks from city playlists for term "${term}":`, error);
      }
    }

    return tracks;
  };

  const findLocalArtists = async (destination: string, countryCode: string) => {
    const searchTerms = [
      `${destination} artist`,
      `${destination} band`,
      `${destination} musician`,
    ];

    const artists: any[] = [];

    for (const term of searchTerms) {
      try {
        console.log(`Searching Spotify for artists: ${term}`);
        const response = await safeSpotifyCall(
          () => fetchFromSpotify(`search?q=${encodeURIComponent(term)}&type=artist&limit=5`),
          { artists: { items: [] } }
        );

        if (response?.artists?.items) {
          const filteredArtists = response.artists.items
            .filter((artist: any) => artist.popularity > 10)
            .map((artist: any) => ({
              id: artist.id,
              name: artist.name,
              imageUrl: artist.images[0]?.url || "https://images.unsplash.com/photo-1517230878791-4d686b3fb427?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8YXJ0aXN0fGVufDB8fDB8fHww",
              uri: artist.uri,
              popularity: artist.popularity,
            }));

          artists.push(...filteredArtists);
          console.log(`Found ${filteredArtists.length} artists for term: ${term}`);
        }
      } catch (error) {
        console.error(`Error finding local artists for ${term}:`, error);
      }
    }

    const uniqueArtists = Array.from(new Map(artists.map((artist) => [artist.id, artist])).values());
    console.log(`Total unique artists found: ${uniqueArtists.length}`);
    return uniqueArtists;
  };

  return {
    results,
    isLoading,
    search,
    searchLocationMusic,
    findLocalArtists,
  };
};