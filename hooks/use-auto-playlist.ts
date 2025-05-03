import { useState } from "react";
import { useSpotifyApi } from "./use-spotify-api";
import { useTripStore } from "../store/trip-store";
import { useAuth } from "../context/auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define types for tracks and artists
interface Artist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  imageUrl: string;
}

interface Track {
  id: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl: string;
  duration_ms: number;
  preview_url?: string;
  uri: string;
}

// Country code mapping for better location matching
const COUNTRY_CODES: Record<string, string> = {
  "United States": "US", "USA": "US", "America": "US",
  "UK": "GB", "United Kingdom": "GB", "Britain": "GB", "England": "GB",
  "Canada": "CA", "Australia": "AU", "Germany": "DE", "France": "FR",
  "Japan": "JP", "Brazil": "BR", "Spain": "ES", "Italy": "IT",
  "Netherlands": "NL", "Sweden": "SE", "Norway": "NO", "Denmark": "DK",
  "Finland": "FI", "Iceland": "IS", "Ireland": "IE", "New Zealand": "NZ",
  "Mexico": "MX", "Argentina": "AR", "Chile": "CL", "Colombia": "CO",
  "Peru": "PE", "Portugal": "PT", "Russia": "RU", "China": "CN",
  "India": "IN", "South Korea": "KR", "South Africa": "ZA", "Malta": "MT",
  "Croatia": "HR", "Greece": "GR", "Turkey": "TR", "Thailand": "TH",
  "Indonesia": "ID", "Malaysia": "MY", "Singapore": "SG", "Philippines": "PH",
  "Vietnam": "VN", "Austria": "AT", "Belgium": "BE", "Switzerland": "CH",
  "Poland": "PL", "Hungary": "HU", "Czech Republic": "CZ", "Slovakia": "SK",
  "Romania": "RO", "Bulgaria": "BG", "Serbia": "RS", "Slovenia": "SI",
  "Ukraine": "UA", "Belarus": "BY", "Estonia": "EE", "Latvia": "LV",
  "Lithuania": "LT", "Morocco": "MA", "Egypt": "EG", "Kenya": "KE",
  "Nigeria": "NG", "Ghana": "GH", "Tanzania": "TZ", "Ethiopia": "ET",
  "Israel": "IL", "Saudi Arabia": "SA", "UAE": "AE", "Qatar": "QA",
  "Kuwait": "KW", "Bahrain": "BH", "Oman": "OM", "Jordan": "JO",
  "Lebanon": "LB", "Iraq": "IQ", "Iran": "IR", "Pakistan": "PK",
  "Bangladesh": "BD", "Sri Lanka": "LK", "Nepal": "NP", "Myanmar": "MM",
  "Cambodia": "KH", "Laos": "LA", "Taiwan": "TW", "Hong Kong": "HK",
  "Macau": "MO", "Mongolia": "MN", "North Korea": "KP", "Fiji": "FJ",
  "Papua New Guinea": "PG", "Solomon Islands": "SB", "Vanuatu": "VU",
  "Samoa": "WS", "Tonga": "TO", "Kiribati": "KI", "Tuvalu": "TV",
  "Nauru": "NR", "Marshall Islands": "MH", "Palau": "PW", "Micronesia": "FM",
  "Cuba": "CU", "Jamaica": "JM", "Haiti": "HT", "Dominican Republic": "DO",
  "Puerto Rico": "PR", "Bahamas": "BS", "Trinidad and Tobago": "TT",
  "Barbados": "BB", "Saint Lucia": "LC", "Grenada": "GD", "Antigua": "AG",
  "Dominica": "DM", "Saint Kitts": "KN", "Saint Vincent": "VC",
  "Belize": "BZ", "Guatemala": "GT", "El Salvador": "SV", "Honduras": "HN",
  "Nicaragua": "NI", "Costa Rica": "CR", "Panama": "PA", "Venezuela": "VE",
  "Guyana": "GY", "Suriname": "SR", "Ecuador": "EC", "Bolivia": "BO",
  "Paraguay": "PY", "Uruguay": "UY", "Algeria": "DZ", "Tunisia": "TN",
  "Libya": "LY", "Sudan": "SD", "South Sudan": "SS", "Chad": "TD",
  "Niger": "NE", "Mali": "ML", "Mauritania": "MR", "Senegal": "SN",
  "Gambia": "GM", "Guinea-Bissau": "GW", "Guinea": "GN", "Sierra Leone": "SL",
  "Liberia": "LR", "Ivory Coast": "CI", "Burkina Faso": "BF", "Togo": "TG",
  "Benin": "BJ", "Cameroon": "CM", "Central African Republic": "CF",
  "Gabon": "GA", "Congo": "CG", "DR Congo": "CD", "Uganda": "UG",
  "Rwanda": "RW", "Burundi": "BI", "Angola": "AO", "Zambia": "ZM",
  "Malawi": "MW", "Mozambique": "MZ", "Zimbabwe": "ZW", "Botswana": "BW",
  "Namibia": "NA", "Lesotho": "LS", "Eswatini": "SZ", "Madagascar": "MG",
  "Comoros": "KM", "Mauritius": "MU", "Seychelles": "SC", "Cape Verde": "CV",
  "Sao Tome": "ST", "Luxembourg": "LU", "Monaco": "MC", "Andorra": "AD",
  "San Marino": "SM", "Liechtenstein": "LI", "Vatican": "VA", "Cyprus": "CY",
  "Albania": "AL", "North Macedonia": "MK", "Montenegro": "ME", "Bosnia": "BA",
  "Moldova": "MD", "Georgia": "GE", "Armenia": "AM", "Azerbaijan": "AZ",
  "Kazakhstan": "KZ", "Uzbekistan": "UZ", "Turkmenistan": "TM",
  "Kyrgyzstan": "KG", "Tajikistan": "TJ", "Afghanistan": "AF"
};

// Popular genres for better recommendations
const POPULAR_GENRES = [
  "pop", "rock", "hip hop", "rap", "r&b", "soul", "jazz", "blues", 
  "electronic", "dance", "reggae", "country", "folk", "classical", 
  "metal", "punk", "indie", "alternative", "latin", "k-pop"
];

export function useAutoPlaylist() {
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const { fetchFromSpotify, safeSpotifyCall } = useSpotifyApi();
  const { addPlaylistToTrip } = useTripStore();
  const { spotifyToken: token } = useAuth();

  // Function to get AI-generated artists for a location
  const getAIArtistsForLocation = async (location: string): Promise<string[]> => {
    setCurrentStep("Finding local artists with AI...");
    setProgress(10);
    
    try {
      // Extract location parts for better context
      const locationParts = location.split(',');
      const city = locationParts[0].trim();
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : city;
      
      // Prepare the prompt for the AI with more specific instructions
      const messages = [
        {
          role: "system",
          content: "You are a music expert with deep knowledge of local music scenes around the world. Focus on authentic local artists that represent the musical culture of the location, not just globally popular artists who happen to be from there."
        },
        {
          role: "user",
          content: `List 8 musicians/bands from ${location} that represent the local music scene well. Include a diverse mix of:
          - Traditional/folk artists from the region
          - Contemporary local artists with cultural significance
          - Underground/indie artists with local following
          - Mainstream artists that are especially popular locally
          
          Only include real artists that would be on Spotify. Return a JSON array with just the artist names, nothing else. Example: ["Artist1", "Artist2", "Artist3", "Artist4", "Artist5", "Artist6", "Artist7", "Artist8"]`
        }
      ];

      // Make the request to the AI with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch("https://toolkit.rork.com/text/llm/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ messages }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Failed to get AI recommendations");
        }

        const data = await response.json();
        let artists: string[] = [];

        try {
          // Parse the JSON response from the AI
          const parsedResponse = JSON.parse(data.completion);
          artists = Array.isArray(parsedResponse) ? parsedResponse : [];
        } catch (e) {
          // If parsing fails, try to extract the array from the text
          const match = data.completion.match(/\[([\s\S]*?)\]/);
          if (match) {
            try {
              artists = JSON.parse(match[0]);
            } catch (e2) {
              console.error("Failed to parse AI response:", e2);
            }
          }
        }

        console.log(`Generated ${artists.length} AI artists for ${location}`);
        setProgress(20);
        
        // Filter out any non-string values and ensure uniqueness
        const validArtists = [...new Set(artists.filter(artist => typeof artist === 'string'))];
        return validArtists;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error in AI request:", error);
        
        // Return a curated list of popular artists from the country if AI fails
        const countryCode = getCountryCode(country);
        return getBackupArtistsForCountry(countryCode);
      }
    } catch (error) {
      console.error("Error getting AI artists:", error);
      return [];
    }
  };

  // Function to get backup artists for a country if AI fails
  const getBackupArtistsForCountry = (countryCode: string): string[] => {
    // Map of popular artists by country code
    const artistsByCountry: Record<string, string[]> = {
      "US": ["Beyoncé", "Kendrick Lamar", "Billie Eilish", "Bruce Springsteen", "Bon Iver"],
      "GB": ["Adele", "Radiohead", "Stormzy", "FKA twigs", "Elton John"],
      "CA": ["Drake", "The Weeknd", "Joni Mitchell", "Arcade Fire", "Shawn Mendes"],
      "AU": ["Tame Impala", "Nick Cave", "Kylie Minogue", "Courtney Barnett", "AC/DC"],
      "FR": ["Daft Punk", "Air", "Christine and the Queens", "Phoenix", "Zaz"],
      "DE": ["Kraftwerk", "Rammstein", "Nena", "Paul Kalkbrenner", "Milky Chance"],
      "JP": ["BABYMETAL", "Perfume", "Utada Hikaru", "RADWIMPS", "Cornelius"],
      "BR": ["Anitta", "Caetano Veloso", "Gilberto Gil", "Seu Jorge", "Marisa Monte"],
      "ES": ["Rosalía", "Enrique Iglesias", "Paco de Lucía", "Camarón de la Isla", "Alejandro Sanz"],
      "IT": ["Laura Pausini", "Andrea Bocelli", "Måneskin", "Ludovico Einaudi", "Eros Ramazzotti"],
      "SE": ["ABBA", "Robyn", "Avicii", "First Aid Kit", "Lykke Li"],
      "KR": ["BTS", "BLACKPINK", "IU", "G-Dragon", "Epik High"],
      "IN": ["A.R. Rahman", "Asha Bhosle", "Arijit Singh", "Nucleya", "Divine"],
      "MX": ["Natalia Lafourcade", "Café Tacvba", "Molotov", "Julieta Venegas", "Carlos Santana"],
      "ZA": ["Ladysmith Black Mambazo", "Die Antwoord", "Black Coffee", "Miriam Makeba", "Hugh Masekela"],
      "NG": ["Fela Kuti", "Burna Boy", "Wizkid", "Tiwa Savage", "King Sunny Ade"],
      "JM": ["Bob Marley", "Sean Paul", "Shaggy", "Koffee", "Protoje"]
    };
    
    // Return artists for the country or a default list
    return artistsByCountry[countryCode] || 
      ["Coldplay", "Dua Lipa", "Bad Bunny", "The Weeknd", "Billie Eilish"];
  };

  // Function to get detailed artist info from Spotify
  const getDetailedArtists = async (artistNames: string[]): Promise<Artist[]> => {
    setCurrentStep("Searching for artists on Spotify...");
    setProgress(30);
    
    const detailedArtists: Artist[] = [];
    
    // Limit to 5 artists to avoid too many API calls
    const limitedArtistNames = artistNames.slice(0, 5);
    
    // Use Promise.all with a timeout wrapper for each promise
    const artistPromises = limitedArtistNames.map(async (name) => {
      try {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error("Search timeout")), 7000)
        );
        
        // Search for the artist on Spotify
        const searchPromise = fetchFromSpotify(`/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`);
        
        // Race the promises
        const searchResult = await Promise.race([searchPromise, timeoutPromise]);
        
        if (searchResult?.artists?.items?.length > 0) {
          const artist = searchResult.artists.items[0];
          
          // Return basic artist info without making another API call
          return {
            id: artist.id,
            name: artist.name,
            genres: artist.genres || [],
            popularity: artist.popularity || 50,
            imageUrl: artist.images?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bXVzaWMlMjBhcnRpc3R8ZW58MHx8MHx8fDA%3D"
          };
        }
        return null;
      } catch (error) {
        console.error(`Error getting details for artist ${name}:`, error);
        return null;
      }
    });

    // Wait for all promises to resolve with a timeout for the entire batch
    const batchTimeoutPromise = new Promise<Artist[]>((resolve) => 
      setTimeout(() => resolve([]), 15000)
    );
    
    const results = await Promise.race([
      Promise.all(artistPromises),
      batchTimeoutPromise
    ]);
    
    // Filter out null results
    const validArtists = results.filter((artist) => artist !== null) as Artist[];
    
    console.log(`Found ${validArtists.length} detailed artists from Spotify`);
    setProgress(40);
    return validArtists;
  };

  // Function to get tracks from country playlists
  const getTracksFromCountryPlaylists = async (location: string): Promise<Track[]> => {
    setCurrentStep("Finding popular playlists for your destination...");
    setProgress(50);
    
    try {
      // Extract country code from location
      const locationParts = location.split(',');
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : location;
      const city = locationParts[0].trim();
      
      // Use country code or default to US
      const countryCode = getCountryCode(country);
      
      // Get tracks from multiple sources
      let collectedTracks: Track[] = [];
      
      // 1. Search for playlists related to the specific city/location
      try {
        // Try city-specific search first for more relevant results
        const citySearchTerm = `${city} music`;
        const citySearchResult = await safeSpotifyCall(
          () => fetchFromSpotify(`/v1/search?q=${encodeURIComponent(citySearchTerm)}&type=playlist&limit=3`),
          { playlists: { items: [] } }
        );
        
        if (citySearchResult?.playlists?.items?.length > 0) {
          // Get tracks from the first 2 playlists
          for (const playlist of citySearchResult.playlists.items.slice(0, 2)) {
            try {
              // Get tracks from the playlist with a timeout
              const playlistTracksPromise = fetchFromSpotify(`/v1/playlists/${playlist.id}/tracks?limit=15`);
              
              const playlistTracks = await Promise.race([
                playlistTracksPromise,
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Playlist tracks timeout")), 7000))
              ]);
              
              if (playlistTracks?.items) {
                // Extract tracks directly
                const playlistItems = playlistTracks.items
                  .filter((item: any) => item.track && !item.track.is_local)
                  .map((item: any) => {
                    const track = item.track;
                    return {
                      id: track.id,
                      name: track.name,
                      artists: track.artists.map((a: any) => a.name),
                      albumName: track.album.name,
                      albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                      duration_ms: track.duration_ms,
                      preview_url: track.preview_url,
                      uri: track.uri
                    };
                  });
                
                collectedTracks.push(...playlistItems);
                console.log(`Got ${playlistItems.length} tracks from city playlist "${playlist.name}"`);
              }
            } catch (error) {
              console.error(`Error getting tracks from playlist ${playlist.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error getting tracks from city playlists:", error);
      }
      
      // 2. Search for playlists related to the country's music
      if (collectedTracks.length < 20) {
        try {
          // Use more specific search terms for better results
          const countrySearchTerms = [
            `${country} traditional music`,
            `${country} popular music`,
            `${country} hits`
          ];
          
          // Try each search term
          for (const searchTerm of countrySearchTerms) {
            if (collectedTracks.length >= 30) break; // Stop if we have enough tracks
            
            const countrySearchResult = await safeSpotifyCall(
              () => fetchFromSpotify(`/v1/search?q=${encodeURIComponent(searchTerm)}&type=playlist&limit=2`),
              { playlists: { items: [] } }
            );
            
            if (countrySearchResult?.playlists?.items?.length > 0) {
              // Get tracks from the first playlist
              const playlist = countrySearchResult.playlists.items[0];
              try {
                // Get tracks from the playlist with a timeout
                const playlistTracksPromise = fetchFromSpotify(`/v1/playlists/${playlist.id}/tracks?limit=15`);
                
                const playlistTracks = await Promise.race([
                  playlistTracksPromise,
                  new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Playlist tracks timeout")), 7000))
                ]);
                
                if (playlistTracks?.items) {
                  // Extract tracks directly
                  const playlistItems = playlistTracks.items
                    .filter((item: any) => item.track && !item.track.is_local)
                    .map((item: any) => {
                      const track = item.track;
                      return {
                        id: track.id,
                        name: track.name,
                        artists: track.artists.map((a: any) => a.name),
                        albumName: track.album.name,
                        albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                        duration_ms: track.duration_ms,
                        preview_url: track.preview_url,
                        uri: track.uri
                      };
                    });
                  
                  collectedTracks.push(...playlistItems);
                  console.log(`Got ${playlistItems.length} tracks from country playlist "${playlist.name}"`);
                }
              } catch (error) {
                console.error(`Error getting tracks from playlist ${playlist.id}:`, error);
              }
            }
          }
        } catch (error) {
          console.error("Error getting tracks from country playlists:", error);
        }
      }
      
      // 3. Try featured playlists for the country
      if (collectedTracks.length < 20) {
        try {
          const featuredPlaylists = await safeSpotifyCall(
            () => fetchFromSpotify(`/v1/browse/featured-playlists?country=${countryCode}&limit=2`),
            { playlists: { items: [] } }
          );
          
          if (featuredPlaylists?.playlists?.items?.length > 0) {
            // Get tracks from the first featured playlist
            const playlist = featuredPlaylists.playlists.items[0];
            try {
              // Get tracks from the playlist with a timeout
              const playlistTracksPromise = fetchFromSpotify(`/v1/playlists/${playlist.id}/tracks?limit=15`);
              
              const playlistTracks = await Promise.race([
                playlistTracksPromise,
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Playlist tracks timeout")), 7000))
              ]);
              
              if (playlistTracks?.items) {
                // Extract tracks directly
                const playlistItems = playlistTracks.items
                  .filter((item: any) => item.track && !item.track.is_local)
                  .map((item: any) => {
                    const track = item.track;
                    return {
                      id: track.id,
                      name: track.name,
                      artists: track.artists.map((a: any) => a.name),
                      albumName: track.album.name,
                      albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                      duration_ms: track.duration_ms,
                      preview_url: track.preview_url,
                      uri: track.uri
                    };
                  });
                
                collectedTracks.push(...playlistItems);
                console.log(`Got ${playlistItems.length} tracks from featured playlist "${playlist.name}"`);
              }
            } catch (error) {
              console.error(`Error getting tracks from playlist ${playlist.id}:`, error);
            }
          }
        } catch (error) {
          console.error("Error getting tracks from featured playlists:", error);
        }
      }
      
      setProgress(60);
      
      // Remove duplicates and limit to 30 tracks
      const uniqueTracks = Array.from(
        new Map(collectedTracks.map(track => [track.id, track])).values()
      ).slice(0, 30);
      
      return uniqueTracks;
    } catch (error) {
      console.error("Error getting tracks from country playlists:", error);
      return [];
    }
  };

  // Function to get tracks from new releases in the country
  const getTracksFromNewReleases = async (location: string): Promise<Track[]> => {
    setCurrentStep("Checking new releases in your destination...");
    setProgress(65);
    
    try {
      // Extract country code from location
      const locationParts = location.split(',');
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : location;
      
      // Get country code (2-letter ISO code)
      const countryCode = getCountryCode(country);
      
      // Get new releases from the country
      const newReleases = await safeSpotifyCall(
        () => fetchFromSpotify(`/v1/browse/new-releases?country=${countryCode}&limit=5`),
        { albums: { items: [] } }
      );
      
      const releaseTracks: Track[] = [];
      
      if (newReleases?.albums?.items?.length > 0) {
        // Process multiple albums to get more variety
        for (const album of newReleases.albums.items.slice(0, 3)) {
          if (album) {
            try {
              // Get tracks from the album with a timeout
              const albumTracksPromise = fetchFromSpotify(`/v1/albums/${album.id}/tracks?limit=5`);
              
              const albumTracks = await Promise.race([
                albumTracksPromise,
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Album tracks timeout")), 7000))
              ]);
              
              // Process tracks directly without getting full details
              if (albumTracks?.items) {
                const albumItems = albumTracks.items.map((track: any) => ({
                  id: track.id,
                  name: track.name,
                  artists: track.artists.map((a: any) => a.name),
                  albumName: album.name,
                  albumImageUrl: album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
                  duration_ms: track.duration_ms || 30000,
                  preview_url: track.preview_url,
                  uri: track.uri
                }));
                
                releaseTracks.push(...albumItems);
                console.log(`Got ${albumItems.length} tracks from new release "${album.name}"`);
              }
            } catch (error) {
              console.error(`Error getting tracks from album ${album.id}:`, error);
            }
          }
        }
      }
      
      setProgress(70);
      return releaseTracks;
    } catch (error) {
      console.error("Error getting tracks from new releases:", error);
      return [];
    }
  };

  // Helper function to get country code
  const getCountryCode = (country: string): string => {
    // Clean up the country name
    const cleanCountry = country.trim();
    
    // Try direct match first
    if (COUNTRY_CODES[cleanCountry]) {
      return COUNTRY_CODES[cleanCountry];
    }
    
    // Try case-insensitive match
    const lowerCountry = cleanCountry.toLowerCase();
    for (const [key, value] of Object.entries(COUNTRY_CODES)) {
      if (key.toLowerCase() === lowerCountry) {
        return value;
      }
    }
    
    // Try partial match
    for (const [key, value] of Object.entries(COUNTRY_CODES)) {
      if (lowerCountry.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCountry)) {
        return value;
      }
    }
    
    // Default to US if no match
    return "US";
  };

  // Function to get tracks from an artist
  const getTracksFromArtist = async (artistId: string): Promise<Track[]> => {
    try {
      // Get top tracks from the artist with a timeout
      const topTracksPromise = fetchFromSpotify(`/v1/artists/${artistId}/top-tracks?market=US`);
      
      const topTracks = await Promise.race([
        topTracksPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Artist tracks timeout")), 7000))
      ]);
      
      if (topTracks?.tracks) {
        return topTracks.tracks.slice(0, 3).map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((a: any) => a.name),
          albumName: track.album.name,
          albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          uri: track.uri
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error getting tracks from artist ${artistId}:`, error);
      return [];
    }
  };

  // Function to get recommendations based on tracks
  const getRecommendations = async (
    trackIds: string[], 
    artistIds: string[] = [], 
    genres: string[] = []
  ): Promise<Track[]> => {
    setCurrentStep("Getting personalized recommendations...");
    setProgress(80);
    
    try {
      // Limit seed items to 5 total (Spotify API limit)
      const seedTracks = trackIds.slice(0, Math.min(2, trackIds.length)).join(',');
      const seedArtists = artistIds.slice(0, Math.min(2, artistIds.length)).join(',');
      const seedGenres = genres.slice(0, Math.min(1, genres.length)).join(',');
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append("limit", "20");
      
      if (seedTracks) params.append("seed_tracks", seedTracks);
      if (seedArtists) params.append("seed_artists", seedArtists);
      if (seedGenres) params.append("seed_genres", seedGenres);
      
      // Add audio features for better recommendations
      params.append("min_popularity", "20"); // Avoid very obscure tracks
      
      // Get recommendations with a timeout
      const recommendationsPromise = fetchFromSpotify(`/v1/recommendations?${params.toString()}`);
      
      const recommendations = await Promise.race([
        recommendationsPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Recommendations timeout")), 10000))
      ]);
      
      if (recommendations?.tracks) {
        return recommendations.tracks.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((a: any) => a.name),
          albumName: track.album.name,
          albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          uri: track.uri
        }));
      }
      
      return [];
    } catch (error) {
      console.warn("Recommendations API returned error, returning empty results:", error);
      return [];
    }
  };

  // Function to get popular tracks as fallback
  const getPopularTracks = async (): Promise<Track[]> => {
    setCurrentStep("Adding popular tracks to complete your playlist...");
    setProgress(85);
    
    try {
      // Get some popular tracks as fallback
      const popularTrackIds = [
        "7mBTxMVwCB9fs4giIDt6kz", // "Shape of You" by Ed Sheeran
        "3kw1vbqYU6GI3xLgfKCikg", // "Blinding Lights" by The Weeknd
        "45PwXUM7qeUItlOoYMJsEx", // "Uptown Funk" by Mark Ronson ft. Bruno Mars
        "7qiZfU4dY1lWllzX7mPBI3", // "despacito" by Luis Fonsi
        "2z9t2dpvYqSyaefJo3MQtp", // "Believer" by Imagine Dragons
        "0VjIjW4GlUZAMYd2vXMi3b", // "Blinding Lights" by The Weeknd
        "6UelLqGlWMcVH1E5c4H7lY", // "Watermelon Sugar" by Harry Styles
        "0e7ipj03S05BNilyu5bRzt", // "rockstar" by Post Malone
        "0pqnGHJpmpxLKifKRmU6WP", // "Believer" by Imagine Dragons
        "7ytR5pFWmSjzHJIeQkgog4", // "ROCKSTAR" by DaBaby
        "0sf12qNH5qcw8qpgymFOqD", // "Blinding Lights" by The Weeknd
        "6DCZcSspjsKoFjzjrWoCdn", // "God's Plan" by Drake
        "2VxeLyX666F8uXCJ0dZF8B", // "Shallow" by Lady Gaga
        "3GCdLUSnKSMJhs4Tj6CV3s", // "All of Me" by John Legend
        "3ee8Jmje8o58CHK66QrVC2", // "Bad Guy" by Billie Eilish
      ];
      
      // Get tracks one by one to avoid overwhelming the API
      const tracks: Track[] = [];
      
      for (const trackId of popularTrackIds.slice(0, 5)) {
        try {
          const track = await fetchFromSpotify(`/v1/tracks/${trackId}`);
          
          if (track) {
            tracks.push({
              id: track.id,
              name: track.name,
              artists: track.artists.map((a: any) => a.name),
              albumName: track.album.name,
              albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
              duration_ms: track.duration_ms,
              preview_url: track.preview_url,
              uri: track.uri
            });
          }
          
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error getting popular track ${trackId}:`, error);
        }
      }
      
      return tracks;
    } catch (error) {
      console.error("Error getting popular tracks:", error);
      return [];
    }
  };

  // Function to get tracks for a destination-based playlist
  const getTracksForDestination = async (location: string): Promise<Track[]> => {
    // Get AI-generated artists for the location
    const aiArtists = await getAIArtistsForLocation(location);
    
    // Get detailed artist info from Spotify
    const detailedArtists = await getDetailedArtists(aiArtists);
    
    // Get tracks from country playlists
    const countryTracks = await getTracksFromCountryPlaylists(location);
    
    // Get tracks from new releases
    const newReleaseTracks = await getTracksFromNewReleases(location);
    
    // Combine all tracks and remove duplicates
    let allTracks: Track[] = [...countryTracks, ...newReleaseTracks];
    
    // Get tracks from each artist (in parallel)
    setCurrentStep("Collecting tracks from local artists...");
    setProgress(75);
    
    if (detailedArtists.length > 0) {
      const artistTrackPromises = detailedArtists.map(artist => 
        getTracksFromArtist(artist.id)
      );
      
      try {
        // Add a timeout for the entire artist tracks collection
        const artistTracksResults = await Promise.race([
          Promise.all(artistTrackPromises),
          new Promise<Track[][]>((resolve) => setTimeout(() => {
            console.log("Artist tracks collection timed out, continuing with what we have");
            return resolve([]); // Return empty array instead of rejecting
          }, 10000))
        ]);
        
        // Flatten the array of track arrays if we got results
        if (Array.isArray(artistTracksResults)) {
          const artistTracks = artistTracksResults.flat();
          allTracks = [...allTracks, ...artistTracks];
          console.log(`Got ${artistTracks.length} tracks from local artists`);
        }
      } catch (error) {
        console.error("Error getting artist tracks:", error);
        // Continue with what we have
      }
    }
    
    // Extract artist IDs and genres for recommendations
    const artistIds = detailedArtists.map(artist => artist.id);
    const genres = detailedArtists
      .flatMap(artist => artist.genres)
      .filter(genre => POPULAR_GENRES.some(popularGenre => 
        genre.toLowerCase().includes(popularGenre.toLowerCase())
      ))
      .slice(0, 2);
    
    // Get recommendations based on these tracks if we have enough
    let recommendedTracks: Track[] = [];
    if (allTracks.length > 0) {
      const trackIds = allTracks.map((t) => t.id);
      recommendedTracks = await getRecommendations(trackIds, artistIds, genres);
      console.log(`Got ${recommendedTracks.length} tracks from first recommendations`);
    }
    
    // Try a second round of recommendations with different seeds if needed
    if (allTracks.length < 5 && recommendedTracks.length < 10) {
      try {
        // Use a different set of track IDs if available
        const secondSeedTracks = [...allTracks, ...recommendedTracks]
          .slice(0, 2)
          .map((t) => t.id);
        
        if (secondSeedTracks.length > 0) {
          const secondRecommendations = await getRecommendations(secondSeedTracks, artistIds, genres);
          recommendedTracks = [...recommendedTracks, ...secondRecommendations];
          console.log(`Got ${secondRecommendations.length} tracks from second recommendations`);
        }
      } catch (error) {
        console.error("Error getting second recommendations:", error);
      }
    }
    
    // Combine all tracks and remove duplicates
    const combinedTracks = [...allTracks, ...recommendedTracks];
    
    // Ensure we don't have too many tracks from the same artist
    const tracksWithArtistCount = new Map<string, number>();
    const diverseTracks: Track[] = [];
    
    for (const track of combinedTracks) {
      // Get the primary artist
      const primaryArtist = track.artists[0];
      
      // Count how many tracks we already have from this artist
      const artistCount = tracksWithArtistCount.get(primaryArtist) || 0;
      
      // Limit to 3 tracks per artist for diversity
      if (artistCount < 3) {
        diverseTracks.push(track);
        tracksWithArtistCount.set(primaryArtist, artistCount + 1);
      }
    }
    
    // Get unique tracks by ID
    const uniqueTracks = Array.from(new Map(diverseTracks.map((t) => [t.id, t])).values());
    
    // If we still don't have enough tracks, add some popular tracks
    if (uniqueTracks.length < 15) {
      const popularTracks = await getPopularTracks();
      uniqueTracks.push(...popularTracks);
    }
    
    console.log(`Total unique tracks: ${uniqueTracks.length}`);
    setProgress(90);
    
    // If we still have no tracks, throw an error
    if (uniqueTracks.length === 0) {
      throw new Error("No tracks found for this destination");
    }
    
    return uniqueTracks;
  };

  // Function to create a playlist on Spotify
  const createPlaylist = async (userId: string, name: string, description: string) => {
    setCurrentStep("Creating playlist on Spotify...");
    setProgress(95);
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          public: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create playlist: ${response.status}`);
      }
      
      const responseText = await response.text();
      if (!responseText) {
        console.log("Empty response when creating playlist");
        throw new Error("Empty response when creating playlist");
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error("JSON parse error:", errorMessage, "Response text:", responseText);
        throw new Error(`Failed to parse playlist creation response: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      throw error;
    }
  };

  // Function to add tracks to a playlist
  const addTracksToPlaylist = async (playlistId: string, trackUris: string[]) => {
    setCurrentStep("Adding tracks to your playlist...");
    setProgress(98);
    
    try {
      // Split track URIs into chunks of 50 (Spotify API limit)
      const chunks = [];
      for (let i = 0; i < trackUris.length; i += 50) {
        chunks.push(trackUris.slice(i, i + 50));
      }
      
      // Add each chunk of tracks
      for (const chunk of chunks) {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: chunk,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to add tracks to playlist: ${response.status}`);
        }
        
        // Add a small delay between chunks
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Return success
      return { success: true };
    } catch (error) {
      console.error("Error adding tracks to playlist:", error);
      throw error;
    }
  };

  // Main function to create an auto-generated playlist
  const createAutoPlaylist = async (tripId: string, destination: string, description: string, tripName?: string) => {
    setIsCreating(true);
    setProgress(0);
    setCurrentStep("Starting playlist creation...");
    
    try {
      // Get user profile
      const userProfileJson = await AsyncStorage.getItem("spotify_user_profile");
      if (!userProfileJson) {
        throw new Error("User profile not found");
      }
      
      const userProfile = JSON.parse(userProfileJson);
      
      // Get tracks for the destination
      const tracks = await getTracksForDestination(destination);
      
      if (tracks.length === 0) {
        throw new Error("No tracks found for this destination");
      }
      
      // Create a playlist name
      const destinationName = destination.split(',')[0];
      const playlistName = tripName ? 
        `${tripName} - ${destinationName} Playlist` : 
        `${destinationName} Vibes`;
      
      // Create the playlist on Spotify
      const playlist = await createPlaylist(userProfile.id, playlistName, description);
      
      // Add tracks to the playlist
      const trackUris = tracks.map((t) => t.uri).filter(Boolean);
      await addTracksToPlaylist(playlist.id, trackUris);
      
      console.log(`Added ${trackUris.length} tracks to playlist: ${playlist.id}`);
      
      // Add the playlist to the trip
      const playlistData = {
        id: playlist.id,
        name: playlistName,
        imageUrl: playlist.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww",
        location: destination,
        trackCount: tracks.length,
        tracks: tracks
      };
      
      addPlaylistToTrip(tripId, playlistData);
      console.log(`Added playlist to trip: ${tripId}`, playlistData);
      
      setCurrentStep("Playlist created successfully!");
      setProgress(100);
      
      return {
        name: playlistName,
        id: playlist.id,
        trackCount: tracks.length
      };
    } catch (error) {
      console.error("Error creating auto playlist:", error);
      setCurrentStep("Error creating playlist");
      throw error;
    } finally {
      setTimeout(() => {
        setIsCreating(false);
        setCurrentStep("");
        setProgress(0);
      }, 1000);
    }
  };

  return { 
    createAutoPlaylist, 
    isCreating,
    currentStep,
    progress
  };
}