// spotify-api-types.ts

// Spotify User Profile
export interface SpotifyUser {
    id: string;
    display_name: string;
    email: string;
    images?: Array<{ url: string }>;
    country?: string;
    product?: string;
    external_urls?: {
      spotify: string;
    };
    followers?: {
      total: number;
    };
  }
  
  // Spotify Artist
  export interface SpotifyArtist {
    id: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
    genres: string[];
    popularity: number;
    uri: string;
    external_urls: {
      spotify: string;
    };
  }
  
  // Spotify Album
  export interface SpotifyAlbum {
    id: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
    release_date: string;
    album_type: string;
    artists: SpotifyArtist[];
    external_urls: {
      spotify: string;
    };
  }
  
  // Spotify Track
  export interface SpotifyTrack {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    duration_ms: number;
    popularity: number;
    uri: string;
    external_urls: {
      spotify: string;
    };
  }
  
  // API Response Types
  export interface SpotifyTopArtistsResponse {
    items: SpotifyArtist[];
    total: number;
    limit: number;
    offset: number;
    href: string;
    next: string | null;
    previous: string | null;
  }
  
  export interface SpotifyTopTracksResponse {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
    href: string;
    next: string | null;
    previous: string | null;
  }
  
  // Stats app specific types
  export interface SpotifyStats {
    user?: {
      displayName: string;
    };
    topArtists?: {
      shortTerm: Array<{
        id: string;
        name: string;
        imageUrl: string;
        popularity: number;
      }>;
    };
    topTracks?: {
      shortTerm: Array<{
        id: string;
        name: string;
        artists: string[];
        albumImageUrl: string;
        popularity: number;
      }>;
    };
    genres?: {
      shortTerm: Array<{
        name: string;
        count: number;
        percentage: number;
      }>;
    };
    stats?: {
      shortTerm: {
        listeningTime: number;
        tracksCount: number;
        uniqueArtistsCount: number;
      };
    };
  }