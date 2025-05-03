import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Switch, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import Colors from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTripStore } from "../store/trip-store";
import { useSpotifyApi } from "../hooks/use-spotify-api";
import { useSpotifySearch } from "../hooks/use-spotify-search";
import { useAutoPlaylist } from "../hooks/use-auto-playlist";
import { useOpenAI } from "../hooks/use-openai";
import { useAuth } from "../context/auth-context";
import { addPlaylist } from "../lib/firestore-service";
import { doc, updateDoc, arrayUnion, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function CreatePlaylistScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { fetchFromSpotify, safeSpotifyCall } = useSpotifyApi();
  const { results, isLoading: isSearchLoading, search, searchLocationMusic, findLocalArtists } = useSpotifySearch();
  const { createAutoPlaylist, isCreating: isAutoCreating, currentStep, progress } = useAutoPlaylist();
  const { generatePlaylistRecommendations, generateLocalArtists, isLoading: isGeneratingRecommendations } = useOpenAI();
  const { spotifyToken, user } = useAuth();
  
  const getTripById = useTripStore((state) => state.getTripById);
  const addPlaylistToTrip = useTripStore((state) => state.addPlaylistToTrip);
  
  const [playlistName, setPlaylistName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [useLocationBased, setUseLocationBased] = useState(true);
  const [showAutoOption, setShowAutoOption] = useState(true);
  const [locationTracks, setLocationTracks] = useState<any[]>([]);
  const [isLoadingLocationTracks, setIsLoadingLocationTracks] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [aiArtists, setAiArtists] = useState<any[]>([]);
  const [isFetchingAiArtists, setIsFetchingAiArtists] = useState(false);
  const [aiRecommendedTracks, setAiRecommendedTracks] = useState<any[]>([]);
  const [isLoadingAiTracks, setIsLoadingAiTracks] = useState(false);
  const [useAiRecommendations, setUseAiRecommendations] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [creationStatus, setCreationStatus] = useState("");
  const [creationProgress, setCreationProgress] = useState(0);

  useEffect(() => {
    if (tripId) {
      const tripData = getTripById(tripId);
      setTrip(tripData);
      
      if (tripData) {
        const defaultName = tripData.name ? 
          `${tripData.name} - ${tripData.destination.split(',')[0]} Playlist` : 
          `${tripData.destination.split(',')[0]} Vibes`;
        
        setPlaylistName(defaultName);
        setDescription(`Music for my trip to ${tripData.destination}`);
        
        if (tripData.countryCode) {
          setCountryCode(tripData.countryCode);
        } else {
          getCountryCode(tripData.destination);
        }
        
        loadAiArtists(tripData.destination);
        loadLocationTracks(tripData.destination, tripData.countryCode);
      }
    }
  }, [tripId, getTripById]);

  useEffect(() => {
    if (isAutoCreating) {
      setCreationStatus(currentStep);
      setCreationProgress(progress);
    }
  }, [isAutoCreating, currentStep, progress]);

  const getCountryCode = async (destination: string) => {
    try {
      const locationParts = destination.split(',');
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : locationParts[0].trim();
      
      if (country.toLowerCase() === 'gibraltar') {
        setCountryCode('GI');
        return 'GI';
      }
      
      const response = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=cca2`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setCountryCode(data[0].cca2);
          console.log("Found country code:", data[0].cca2, "for", country);
          return data[0].cca2;
        }
      }
    } catch (err) {
      console.log("Error getting country code:", err);
    }
    return null;
  };

  const loadLocationTracks = async (destination: string, existingCountryCode?: string) => {
    setIsLoadingLocationTracks(true);
    setCreationStatus("Finding music for your destination...");
    setCreationProgress(30);
    
    try {
      const locationParts = destination.split(',');
      const city = locationParts[0].trim();
      const country = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : city;
      let countryCode = existingCountryCode || await getCountryCode(destination) || "US";
      const tracks: any[] = [];
      
      await searchLocationMusic(destination);
      
      setCreationStatus("Finding featured playlists in your destination...");
      setCreationProgress(40);
      
      try {
        const featuredPlaylists = await safeSpotifyCall(
          () => fetchFromSpotify(`browse/featured-playlists?country=${countryCode}&limit=2`),
          { playlists: { items: [] } }
        );
        
        if (featuredPlaylists?.playlists?.items?.length > 0) {
          const playlistId = featuredPlaylists.playlists.items[0].id;
          const playlistTracks = await safeSpotifyCall(
            () => fetchFromSpotify(`playlists/${playlistId}/tracks?limit=15`),
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
                  preview_url: track.preview_url
                };
              });
            
            tracks.push(...playlistItems);
            console.log(`Got ${playlistItems.length} tracks from featured playlist in ${countryCode}`);
          }
        } else {
          console.log(`No featured playlists found for country ${countryCode}`);
        }
      } catch (err) {
        console.log(`Error getting featured playlists for country ${countryCode}:`, err);
      }
      
      try {
        const globalFeaturedPlaylists = await safeSpotifyCall(
          () => fetchFromSpotify(`browse/featured-playlists?limit=2`),
          { playlists: { items: [] } }
        );
        
        if (globalFeaturedPlaylists?.playlists?.items?.length > 0) {
          const playlistId = globalFeaturedPlaylists.playlists.items[0].id;
          const playlistTracks = await safeSpotifyCall(
            () => fetchFromSpotify(`playlists/${playlistId}/tracks?limit=15`),
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
                  preview_url: track.preview_url
                };
              });
            
            tracks.push(...playlistItems);
            console.log(`Got ${playlistItems.length} tracks from global featured playlist`);
          }
        }
      } catch (err) {
        console.log("Error getting tracks from global featured playlists:", err);
      }
      
      setCreationStatus("Finding new releases in your destination...");
      setCreationProgress(50);
      
      try {
        const newReleases = await safeSpotifyCall(
          () => fetchFromSpotify(`browse/new-releases?country=${countryCode}&limit=3`),
          { albums: { items: [] } }
        );
        
        if (newReleases?.albums?.items?.length > 0) {
          for (let i = 0; i < Math.min(2, newReleases.albums.items.length); i++) {
            const albumId = newReleases.albums.items[i].id;
            const albumTracks = await safeSpotifyCall(
              () => fetchFromSpotify(`albums/${albumId}/tracks?limit=5`),
              { items: [] }
            );
            
            if (albumTracks?.items) {
              for (const track of albumTracks.items.slice(0, 5)) {
                try {
                  const trackDetails = await safeSpotifyCall(
                    () => fetchFromSpotify(`tracks/${track.id}`),
                    null
                  );
                  
                  if (trackDetails) {
                    tracks.push({
                      id: trackDetails.id,
                      name: trackDetails.name,
                      type: "track",
                      artist: trackDetails.artists.map((a: any) => a.name).join(", "),
                      artists: trackDetails.artists.map((a: any) => a.name),
                      albumImageUrl: trackDetails.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsbnVtfGVufDB8fDB8fHww",
                      uri: trackDetails.uri,
                      preview_url: track.preview_url
                    });
                  }
                } catch (err) {
                  console.log(`Error getting details for track ${track.id}:`, err);
                }
              }
            }
          }
          console.log(`Got tracks from ${Math.min(2, newReleases.albums.items.length)} albums in ${countryCode}`);
        }
      } catch (err) {
        console.log("Error getting tracks from new releases:", err);
      }
      
      setCreationStatus("Finding local artists for your destination...");
      setCreationProgress(60);
      
      try {
        const localArtists = await findLocalArtists(destination, countryCode);
        console.log(`Found ${localArtists.length} local artists for ${destination}`);
        
        for (const artist of localArtists.slice(0, 3)) {
          try {
            const artistTopTracks = await safeSpotifyCall(
              () => fetchFromSpotify(`artists/${artist.id}/top-tracks?market=${countryCode}`),
              { tracks: [] }
            );
            
            if (artistTopTracks?.tracks?.length > 0) {
              const artistTracks = artistTopTracks.tracks.slice(0, 3).map((track: any) => ({
                id: track.id,
                name: track.name,
                type: "track",
                artist: track.artists.map((a: any) => a.name).join(", "),
                artists: track.artists.map((a: any) => a.name),
                albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsbnVtfGVufDB8fDB8fHww",
                uri: track.uri,
                preview_url: track.preview_url
              }));
              
              tracks.push(...artistTracks);
              console.log(`Got ${artistTracks.length} tracks from artist ${artist.name}`);
            }
          } catch (err) {
            console.log(`Error getting top tracks for artist ${artist.name}:`, err);
          }
        }
      } catch (err) {
        console.log("Error getting tracks from local artists:", err);
      }
      
      setCreationStatus("Getting personalized recommendations...");
      setCreationProgress(70);

      try {
        const seedTracks = tracks
          .slice(0, 5)
          .map(track => track.id)
          .filter(Boolean);
        
        if (seedTracks.length > 0) {
          console.log("Seed tracks for recommendations:", seedTracks);
          const recommendationsUrl = `recommendations?limit=20&seed_tracks=${seedTracks.slice(0, 2).join(',')}&market=${countryCode || 'US'}`;
          
          try {
            const recommendations = await safeSpotifyCall(
              () => fetchFromSpotify(recommendationsUrl),
              { tracks: [] }
            );
            
            if (recommendations?.tracks?.length > 0) {
              const recommendationTracks = recommendations.tracks.map((track: any) => ({
                id: track.id,
                name: track.name,
                type: "track",
                artist: track.artists.map((a: any) => a.name).join(", "),
                artists: track.artists.map((a: any) => a.name),
                albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsbnVtfGVufDB8fDB8fHww",
                uri: track.uri,
                preview_url: track.preview_url
              }));
              
              tracks.push(...recommendationTracks);
              console.log(`Got ${recommendationTracks.length} tracks from recommendations`);
            } else {
              console.log("No recommendations returned from Spotify");
            }
          } catch (err) {
            console.log("Error getting recommendations:", err);
            const fallbackUrl = `recommendations?limit=20&seed_tracks=${seedTracks.slice(0, 2).join(',')}`;
            try {
              const fallbackRecommendations = await safeSpotifyCall(
                () => fetchFromSpotify(fallbackUrl),
                { tracks: [] }
              );
              if (fallbackRecommendations?.tracks?.length > 0) {
                const recommendationTracks = fallbackRecommendations.tracks.map((track: any) => ({
                  id: track.id,
                  name: track.name,
                  type: "track",
                  artist: track.artists.map((a: any) => a.name).join(", "),
                  artists: track.artists.map((a: any) => a.name),
                  albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsbnVtfGVufDB8fDB8fHww",
                  uri: track.uri,
                  preview_url: track.preview_url
                }));
                tracks.push(...recommendationTracks);
                console.log(`Got ${recommendationTracks.length} tracks from fallback recommendations`);
              }
            } catch (fallbackErr) {
              console.log("Error getting fallback recommendations:", fallbackErr);
            }
          }
        } else {
          console.log("No seed tracks available for recommendations");
        }
      } catch (err) {
        console.log("Error in recommendations section:", err);
      }
      
      const uniqueTracks = Array.from(
        new Map(tracks.map((track: any) => [track.id, track])).values()
      );
      
      console.log(`Total unique location tracks: ${uniqueTracks.length}`);
      setLocationTracks(uniqueTracks);
      
      if (trip && trip.description) {
        generateAiRecommendations();
      }
    } catch (error) {
      console.error("Error loading location tracks:", error);
    } finally {
      setIsLoadingLocationTracks(false);
      setCreationStatus("");
      setCreationProgress(0);
    }
  };

  const loadAiArtists = async (destination: string) => {
    setIsFetchingAiArtists(true);
    setCreationStatus("Finding local artists with AI...");
    setCreationProgress(10);
    
    try {
      const artists = await generateLocalArtists(destination, countryCode, 5);
      console.log(`Generated ${artists.length} AI artists for ${destination}`);
      setAiArtists(artists);
      
      if (artists.length > 0) {
        loadTracksFromAiArtists(artists);
      }
    } catch (error) {
      console.error("Error loading AI artists:", error);
    } finally {
      setIsFetchingAiArtists(false);
    }
  };

  const loadTracksFromAiArtists = async (artists: any[]) => {
    if (!artists.length) return;
    
    setCreationStatus("Finding tracks from local artists...");
    setCreationProgress(20);
    
    try {
      let aiTracks: any[] = [];
      
      for (const aiArtist of artists.slice(0, 5)) {
        try {
          const searchResponse = await safeSpotifyCall(
            () => fetchFromSpotify(`search?q=${encodeURIComponent(aiArtist.name)}&type=artist&limit=1`),
            { artists: { items: [] } }
          );
          
          if (searchResponse?.artists?.items?.length > 0) {
            const spotifyArtist = searchResponse.artists.items[0];
            
            const topTracksResponse = await safeSpotifyCall(
              () => fetchFromSpotify(`artists/${spotifyArtist.id}/top-tracks?market=${countryCode || 'US'}`),
              { tracks: [] }
            );
            
            if (topTracksResponse?.tracks?.length > 0) {
              const artistTracks = topTracksResponse.tracks.slice(0, 3).map((track: any) => ({
                id: track.id,
                name: track.name,
                type: "track",
                artist: track.artists.map((a: any) => a.name).join(", "),
                artists: track.artists.map((a: any) => a.name),
                albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsbnVtfGVufDB8fDB8fHww",
                uri: track.uri,
                preview_url: track.preview_url,
                aiArtistId: spotifyArtist.id,
                aiArtistName: aiArtist.name,
                aiDescription: aiArtist.description,
                aiFamousLevel: aiArtist.famousLevel
              }));
              
              aiTracks = [...aiTracks, ...artistTracks];
              console.log(`Added ${artistTracks.length} tracks from AI artist ${aiArtist.name}`);
            }
          }
        } catch (err) {
          console.log(`Error getting tracks for AI artist ${aiArtist.name}:`, err);
        }
      }
      
      if (aiTracks.length > 0) {
        console.log(`Found ${aiTracks.length} tracks from AI artists`);
        setLocationTracks(prevTracks => {
          const allTracks = [...prevTracks, ...aiTracks];
          return Array.from(
            new Map(allTracks.map(track => [track.id, track])).values()
          );
        });
      }
    } catch (error) {
      console.error("Error loading tracks from AI artists:", error);
    }
  };

  const generateAiRecommendations = async () => {
    if (!trip) return;
    
    setIsLoadingAiTracks(true);
    setCreationStatus("Generating AI music recommendations...");
    setCreationProgress(80);
    
    try {
      const trackNames = await generatePlaylistRecommendations(
        trip.name || `Trip to ${trip.destination.split(',')[0]}`,
        trip.destination,
        trip.description,
        trip.countryCode
      );
      
      console.log(`Got ${trackNames.length} AI track recommendations`);
      setCreationStatus("Finding recommended tracks on Spotify...");
      setCreationProgress(90);
      
      const tracks: any[] = [];
      for (const trackName of trackNames) {
        try {
          const searchResponse = await safeSpotifyCall(
            () => fetchFromSpotify(`search?q=${encodeURIComponent(trackName)}&type=track&limit=1`),
            { tracks: { items: [] } }
          );
          
          if (searchResponse?.tracks?.items?.length > 0) {
            const track = searchResponse.tracks.items[0];
            tracks.push({
              id: track.id,
              name: track.name,
              type: "track",
              artist: track.artists.map((a: any) => a.name).join(", "),
              artists: track.artists.map((a: any) => a.name),
              albumImageUrl: track.album.images[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsbnVtfGVufDB8fDB8fHww",
              uri: track.uri,
              preview_url: track.preview_url,
              isAiRecommended: true
            });
          }
        } catch (err) {
          console.log(`Error searching for track "${trackName}":`, err);
        }
      }
      
      console.log(`Found ${tracks.length} Spotify tracks from AI recommendations`);
      setAiRecommendedTracks(tracks);
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
    } finally {
      setIsLoadingAiTracks(false);
      setCreationStatus("");
      setCreationProgress(0);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      search(text);
    }
  };

  const toggleTrackSelection = (track: any) => {
    if (selectedTracks.some(t => t.id === track.id)) {
      setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
    } else {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleClose = () => {
    if (selectedTracks.length > 0 && !isCreating && !isAutoCreating) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard this playlist?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleConfirmDescription = () => {
    setIsEditingDescription(false);
  };

  const handleRegenerateAiRecommendations = () => {
    generateAiRecommendations();
  };

  const createPlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert("Missing Information", "Please enter a playlist name");
      return;
    }
    if (
      selectedTracks.length === 0 &&
      !useLocationBased &&
      !useAiRecommendations
    ) {
      Alert.alert(
        "No Tracks Selected",
        "Select at least one track or enable location/AI recommendations"
      );
      return;
    }
    if (!spotifyToken) {
      Alert.alert("Authentication Error", "Please log in to Spotify first");
      return;
    }
    if (!tripId) {
      Alert.alert("Error", "Invalid trip ID");
      return;
    }

    setIsCreating(true);
    setCreationStatus("Creating your playlist...");
    setCreationProgress(10);

    try {
      const meResponse = await fetchFromSpotify("/v1/me");
      const userId = meResponse.id;

      const newPlaylist = await fetchFromSpotify(
        `/v1/users/${userId}/playlists`,
        {
          method: "POST",
          body: JSON.stringify({
            name: playlistName,
            description,
            public: false,
          }),
        }
      );
      setCreationProgress(30);

      if (!newPlaylist?.id) {
        throw new Error("Failed to create Spotify playlist: No playlist ID returned");
      }

      let trackUris = selectedTracks.map((t) => t.uri);
      if (useLocationBased) {
        trackUris = trackUris.concat(locationTracks.map((t) => t.uri));
      }
      if (useAiRecommendations) {
        trackUris = trackUris.concat(aiRecommendedTracks.map((t) => t.uri));
      }
      trackUris = Array.from(new Set(trackUris)).slice(0, 50);

      if (trackUris.length > 0) {
        setCreationStatus("Adding tracks to your playlist...");
        setCreationProgress(60);
        await fetchFromSpotify(
          `/v1/playlists/${newPlaylist.id}/tracks`,
          {
            method: "POST",
            body: JSON.stringify({ uris: trackUris }),
          }
        );
      }

      // Update local store
      addPlaylistToTrip(tripId, newPlaylist.id);

      // Update Firestore with transaction
      const tripRef = doc(db, "trips", tripId);
      await runTransaction(db, async (transaction) => {
        const tripDoc = await transaction.get(tripRef);
        if (!tripDoc.exists()) {
          throw new Error("Trip document does not exist!");
        }
        const currentPlaylists = tripDoc.data().playlists || [];
        transaction.update(tripRef, {
          playlists: [...new Set([...currentPlaylists, newPlaylist.id])],
          updatedAt: new Date().toISOString(),
        });
        console.log("Successfully updated Firestore with playlist ID:", newPlaylist.id);
      });

      setCreationProgress(100);
      Alert.alert(
        "Playlist Created!",
        `“${playlistName}” now has ${trackUris.length} tracks.`,
        [
          {
            text: "View Playlist",
            onPress: () => router.push(`/playlist/${newPlaylist.id}`),
          },
          {
            text: "Back to Trip",
            onPress: () => router.push(`/trip/${tripId}`),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating playlist:", error);
      const message = error.message || "Something went wrong.";
      Alert.alert("Error", message);
    } finally {
      setIsCreating(false);
      setCreationStatus("");
      setCreationProgress(0);
    }
  };
  
  const handleCreateAutoPlaylist = async () => {
    if (!trip) return;
    
    try {
      const result = await createAutoPlaylist(
        tripId!,
        trip.destination,
        trip.description,
        trip.name
      );
      
      if (result) {
        // Update local store
        addPlaylistToTrip(tripId!, result.id);

        // Update Firestore with transaction
        const tripRef = doc(db, "trips", tripId!);
        await runTransaction(db, async (transaction) => {
          const tripDoc = await transaction.get(tripRef);
          if (!tripDoc.exists()) {
            throw new Error("Trip document does not exist!");
          }
          const currentPlaylists = tripDoc.data().playlists || [];
          transaction.update(tripRef, {
            playlists: [...new Set([...currentPlaylists, result.id])],
            updatedAt: new Date().toISOString(),
          });
          console.log("Successfully updated Firestore with auto playlist ID:", result.id);
        });

        Alert.alert(
          "Auto Playlist Created",
          `Your playlist "${result.name}" has been created with ${result.trackCount} tracks!`,
          [
            { 
              text: "View Playlist", 
              onPress: () => router.push(`/playlist/${result.id}`) 
            },
            { 
              text: "Back to Trip", 
              onPress: () => router.push(`/trip/${tripId}`) 
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error creating auto playlist:", error);
      Alert.alert(
        "Playlist Creation Failed",
        "There was an error creating your playlist. Please try again later.",
        [{ text: "OK" }]
      );
    }
  };

  const renderTrackItem = ({ item }: { item: any }) => {
    const isSelected = selectedTracks.some(track => track.id === item.id);
    const isAiArtistTrack = item.aiArtistId !== undefined;
    const isAiRecommended = item.isAiRecommended;
    
    return (
      <TouchableOpacity 
        style={[
          styles.trackItem, 
          isSelected && styles.selectedTrackItem,
          isAiArtistTrack && styles.aiArtistTrackItem,
          isAiRecommended && styles.aiRecommendedTrackItem
        ]} 
        onPress={() => toggleTrackSelection(item)}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: item.albumImageUrl }} 
          style={styles.trackImage} 
          contentFit="cover"
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
          {isAiArtistTrack && (
            <Text style={styles.aiArtistLabel}>Local Artist</Text>
          )}
          {isAiRecommended && (
            <Text style={styles.aiRecommendedLabel}>AI Recommended</Text>
          )}
        </View>
        <View style={[styles.selectIndicator, isSelected && styles.selectedIndicator]}>
          {isSelected ? (
            <Ionicons name="checkmark-outline" size={16} color={Colors.text} />
          ) : (
            <Ionicons name="add" size={16} color={Colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!trip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  let displayTracks: any[] = [];
  
  if (searchQuery.length > 2) {
    displayTracks = results.filter(item => item.type === 'track');
  } else if (useAiRecommendations && aiRecommendedTracks.length > 0) {
    displayTracks = [...aiRecommendedTracks];
    if (useLocationBased) {
      const aiTrackIds = new Set(aiRecommendedTracks.map(track => track.id));
      const filteredLocationTracks = locationTracks.filter(track => !aiTrackIds.has(track.id));
      displayTracks = [...displayTracks, ...filteredLocationTracks];
    }
  } else {
    displayTracks = locationTracks;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Playlist</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.formContainer}>
          {showAutoOption && (
            <TouchableOpacity 
              style={styles.autoPlaylistCard}
              onPress={handleCreateAutoPlaylist}
              disabled={isAutoCreating}
            >
              <View style={styles.autoPlaylistContent}>
                <Ionicons name="sparkles-outline" size={24} color={Colors.primary} style={styles.autoPlaylistIcon} />
                <View style={styles.autoPlaylistTextContainer}>
                  <Text style={styles.autoPlaylistTitle}>Create Auto Playlist</Text>
                  <Text style={styles.autoPlaylistDescription}>
                    Let us create a personalized playlist based on your destination and music preferences
                  </Text>
                </View>
              </View>
              {isAutoCreating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="add" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CREATE MANUALLY</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Playlist Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="musical-notes-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter playlist name"
                placeholderTextColor={Colors.textSecondary}
                value={playlistName}
                onChangeText={setPlaylistName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.descriptionHeader}>
              <Text style={styles.inputLabel}>Description</Text>
              <View style={styles.descriptionControls}>
                {isEditingDescription ? (
                  <TouchableOpacity 
                    style={styles.descriptionControl} 
                    onPress={handleConfirmDescription}
                  >
                    <Ionicons name="checkmark-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.descriptionControl} 
                    onPress={handleEditDescription}
                  >
                    <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter playlist description"
                placeholderTextColor={Colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                editable={isEditingDescription}
              />
            </View>
          </View>

          <View style={styles.togglesContainer}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleTextContainer}>
                <Ionicons name="location-outline" size={18} color={Colors.primary} style={styles.toggleIcon} />
                <Text style={styles.toggleText}>Include location music</Text>
              </View>
              <Switch
                value={useLocationBased}
                onValueChange={setUseLocationBased}
                trackColor={{ false: Colors.cardBackground, true: Colors.primary }}
                thumbColor={Colors.text}
              />
            </View>
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleTextContainer}>
                <Ionicons name="sparkles-outline" size={18} color={Colors.primary} style={styles.toggleIcon} />
                <Text style={styles.toggleText}>Include AI recommendations</Text>
              </View>
              <View style={styles.aiToggleContainer}>
                {aiRecommendedTracks.length > 0 && (
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={handleRegenerateAiRecommendations}
                    disabled={isLoadingAiTracks}
                  >
                    <Ionicons name="refresh-outline" size={16} color={isLoadingAiTracks ? Colors.divider : Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <Switch
                  value={useAiRecommendations}
                  onValueChange={setUseAiRecommendations}
                  trackColor={{ false: Colors.cardBackground, true: Colors.primary }}
                  thumbColor={Colors.text}
                />
              </View>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.inputLabel}>Add Tracks</Text>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search for tracks"
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
          </View>

          <View style={styles.selectedCount}>
            <Text style={styles.selectedCountText}>
              {selectedTracks.length} tracks selected
              {useLocationBased && locationTracks.length > 0 && ` + ${locationTracks.length} location tracks`}
              {useAiRecommendations && aiRecommendedTracks.length > 0 && ` + ${aiRecommendedTracks.length} AI recommendations`}
              {aiArtists.length > 0 && ` (including ${aiArtists.length} local artists)`}
            </Text>
          </View>

          {(isSearchLoading || isLoadingLocationTracks || isFetchingAiArtists || isLoadingAiTracks) ? (
            <View style={styles.loadingResults}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>
                {isLoadingAiTracks ? "Generating AI recommendations..." :
                 isFetchingAiArtists ? "Finding local artists..." : 
                 "Loading tracks..."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayTracks}
              keyExtractor={(item) => item.id}
              renderItem={renderTrackItem}
              style={styles.tracksList}
              contentContainerStyle={styles.tracksListContent}
              ListEmptyComponent={
                searchQuery.length > 2 ? (
                  <Text style={styles.emptyResultsText}>No tracks found</Text>
                ) : (
                  <Text style={styles.emptyResultsText}>
                    {isLoadingLocationTracks 
                      ? "Loading location tracks..." 
                      : "Search for tracks to add to your playlist"}
                  </Text>
                )
              }
            />
          )}

          <TouchableOpacity 
            style={[
              styles.createButton, 
              (isCreating || (!useLocationBased && !useAiRecommendations && selectedTracks.length === 0)) && styles.disabledButton
            ]} 
            onPress={createPlaylist}
            disabled={isCreating || (!useLocationBased && !useAiRecommendations && selectedTracks.length === 0)}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? "Creating..." : "Create Playlist"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {(isCreating || isAutoCreating) && (creationStatus || currentStep) && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={true}
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.progressModal}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.progressIndicator} />
              <Text style={styles.progressText}>{creationStatus || currentStep}</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${creationProgress || progress}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  autoPlaylistCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  autoPlaylistContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  autoPlaylistIcon: {
    marginRight: 12,
  },
  autoPlaylistTextContainer: {
    flex: 1,
  },
  autoPlaylistTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  autoPlaylistDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: 16,
  },
  descriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  descriptionControls: {
    flexDirection: "row",
  },
  descriptionControl: {
    marginLeft: 12,
    padding: 4,
  },
  togglesContainer: {
    marginBottom: 20,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  toggleTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleIcon: {
    marginRight: 8,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  aiToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  selectedCount: {
    marginBottom: 10,
  },
  selectedCountText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tracksList: {
    flex: 1,
  },
  tracksListContent: {
    paddingBottom: 20,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  selectedTrackItem: {
    backgroundColor: "rgba(29, 185, 84, 0.1)",
  },
  aiArtistTrackItem: {
    backgroundColor: "rgba(100, 65, 165, 0.1)",
  },
  aiRecommendedTrackItem: {
    backgroundColor: "rgba(255, 165, 0, 0.1)",
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  aiArtistLabel: {
    fontSize: 12,
    color: "#9370DB",
    marginTop: 2,
  },
  aiRecommendedLabel: {
    fontSize: 12,
    color: "#FFA500",
    marginTop: 2,
  },
  selectIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  selectedIndicator: {
    backgroundColor: Colors.primary,
  },
  loadingResults: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyResultsText: {
    textAlign: "center",
    color: Colors.textSecondary,
    marginTop: 20,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  createButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  progressIndicator: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: Colors.divider,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
});