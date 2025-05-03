import { useState } from "react";
import { getAuth } from 'firebase/auth';

// MusicBrainz API base URL
const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";

// User agent is required by MusicBrainz API
const USER_AGENT = "TravelTunes/1.0.0 (https://github.com/yourusername/travel-tunes)";

// Type definitions for MusicBrainz API
interface MusicBrainzArea {
  id: string;
  name: string;
  "life-span"?: {
    "begin"?: string;
    "end"?: string;
  };
  country?: string;
  score?: number;
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  score: number;
  type?: string;
  country?: string;
  disambiguation?: string;
}

interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "first-release-date"?: string;
}

interface MusicBrainzArtistResponse {
  id: string;
  name: string;
  type?: string;
  country?: string;
  disambiguation?: string;
  "release-groups"?: MusicBrainzReleaseGroup[];
}

export function useMusicBrainz() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get Firebase Auth token if needed for authenticated requests
  const getFirebaseToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  };

  // Helper function to make API calls to MusicBrainz
  const fetchFromMusicBrainz = async (endpoint: string, params: Record<string, string> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string from params
      const queryParams = new URLSearchParams({
        fmt: "json", // Always request JSON format
        ...params
      }).toString();

      const url = `${MUSICBRAINZ_API_BASE_URL}${endpoint}?${queryParams}`;
      console.log(`Fetching from MusicBrainz: ${url}`);

      // MusicBrainz requires a user-agent header
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching from MusicBrainz:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch from MusicBrainz"));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Search for an area (city, country, etc.)
  const searchArea = async (location: string): Promise<MusicBrainzArea | null> => {
    try {
      // Extract city and country from location string
      const locationParts = location.split(',');
      const city = locationParts[0].trim();
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : "";
      
      // Search for the area
      const query = country ? `${city} AND country:${country}` : city;
      const data = await fetchFromMusicBrainz("/area", { query });
      
      if (!data || !data.areas || data.areas.length === 0) {
        console.log(`No areas found for ${location}`);
        return null;
      }
      
      // Return the first matching area
      return data.areas[0];
    } catch (err) {
      console.error("Error searching for area:", err);
      return null;
    }
  };

  // Get artists from a specific area
  const getArtistsFromArea = async (areaId: string, limit = 50): Promise<MusicBrainzArtist[]> => {
    try {
      const data = await fetchFromMusicBrainz("/artist", { 
        area: areaId,
        limit: limit.toString()
      });
      
      if (!data || !data.artists || data.artists.length === 0) {
        console.log(`No artists found for area ${areaId}`);
        return [];
      }
      
      return data.artists;
    } catch (err) {
      console.error("Error getting artists from area:", err);
      return [];
    }
  };

  // Get artists based on location string (city, country)
  const getArtistsByLocation = async (location: string, limit = 20) => {
    try {
      // First find the area
      const area = await searchArea(location);
      if (!area) {
        console.log(`Could not find area for ${location}`);
        return [];
      }
      
      console.log(`Found area: ${area.name} (${area.id})`);
      
      // Then get artists from that area
      const artists = await getArtistsFromArea(area.id, limit);
      console.log(`Found ${artists.length} artists from ${area.name}`);
      
      // Filter out artists with low score or no name
      const validArtists = artists
        .filter((artist: MusicBrainzArtist) => artist.score > 50 && artist.name)
        .map((artist: MusicBrainzArtist) => ({
          id: artist.id,
          name: artist.name,
          type: artist.type || "Person",
          country: artist.country || area.country || "",
          disambiguation: artist.disambiguation || "",
          score: artist.score
        }));
      
      return validArtists;
    } catch (err) {
      console.error("Error getting artists by location:", err);
      return [];
    }
  };

  // Get releases (albums) by an artist
  const getArtistReleases = async (artistId: string, limit = 10) => {
    try {
      const data: MusicBrainzArtistResponse | null = await fetchFromMusicBrainz(`/artist/${artistId}`, {
        inc: "release-groups",
        limit: limit.toString()
      });
      
      if (!data || !data["release-groups"] || data["release-groups"].length === 0) {
        console.log(`No releases found for artist ${artistId}`);
        return [];
      }
      
      return data["release-groups"].map((release: MusicBrainzReleaseGroup) => ({
        id: release.id,
        title: release.title,
        type: release["primary-type"] || "Unknown",
        year: release["first-release-date"] ? release["first-release-date"].substring(0, 4) : "Unknown"
      }));
    } catch (err) {
      console.error("Error getting artist releases:", err);
      return [];
    }
  };

  // Get genres for a location by aggregating artist genres
  const getGenresByLocation = async (location: string) => {
    try {
      const artists = await getArtistsByLocation(location, 30);
      
      if (artists.length === 0) {
        return [];
      }
      
      // MusicBrainz doesn't directly provide genres, so we'll need to
      // get this information from another source or infer it from the artist types
      // For now, we'll return a placeholder
      return ["Local Music", "Regional", "Traditional"];
    } catch (err) {
      console.error("Error getting genres by location:", err);
      return [];
    }
  };

  return {
    isLoading,
    error,
    searchArea,
    getArtistsFromArea,
    getArtistsByLocation,
    getArtistReleases,
    getGenresByLocation
  };
}