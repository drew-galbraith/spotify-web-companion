import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Colors from "../../constants/colors";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import StatCard from "../../components/stat-card";
import TopItemsList from "../../components/top-items-list";
import GenreDistribution from "../../components/genre-distribution";
import { usePlayerStore } from "../../store/player-store";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/auth-context";
import { 
  SpotifyStats, 
  SpotifyUser, 
  SpotifyTopArtistsResponse, 
  SpotifyTopTracksResponse,
  SpotifyArtist,
  SpotifyTrack
} from "../../types/spotify-api-types";

export default function IndexScreen() {
  const [data, setData] = useState<SpotifyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { user, spotifyToken } = useAuth();
  const { currentTrack, isPlaying } = usePlayerStore();
  const router = useRouter();

  // Fetch data from Spotify API
  useEffect(() => {
    async function fetchSpotifyData() {
      if (!spotifyToken) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Starting Spotify API fetch with token:", spotifyToken.substring(0, 10) + "...");
        
        // Fetch user profile
        console.log("Fetching user profile...");
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${spotifyToken}` },
        });
        
        if (!userResponse.ok) {
          console.error("User profile fetch failed:", await userResponse.text());
          throw new Error('Failed to fetch user profile');
        }
        const userData = await userResponse.json();
        console.log("User profile fetched successfully");
        
        // Fetch top artists
        console.log("Fetching top artists...");
        const topArtistsResponse = await fetch(
          'https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=10', 
          { headers: { Authorization: `Bearer ${spotifyToken}` } }
        );
        
        if (!topArtistsResponse.ok) {
          console.error("Top artists fetch failed:", await topArtistsResponse.text());
          throw new Error('Failed to fetch top artists');
        }
        const topArtistsData = await topArtistsResponse.json();
        console.log("Top artists fetched successfully, count:", topArtistsData.items.length);
        
        // Fetch top tracks
        console.log("Fetching top tracks...");
        const topTracksResponse = await fetch(
          'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10',
          { headers: { Authorization: `Bearer ${spotifyToken}` } }
        );
        
        if (!topTracksResponse.ok) {
          console.error("Top tracks fetch failed:", await topTracksResponse.text());
          throw new Error('Failed to fetch top tracks');
        }
        const topTracksData = await topTracksResponse.json();
        console.log("Top tracks fetched successfully, count:", topTracksData.items.length);
        
        // Process genre data from top artists
        const allGenres = topArtistsData.items.flatMap((artist: SpotifyArtist) => artist.genres);
        const genreCounts = allGenres.reduce((acc: Record<string, number>, genre: string) => {
          acc[genre] = (acc[genre] || 0) + 1;
          return acc;
        }, {});
        
        const totalGenres = allGenres.length;
        const genreDistribution = Object.entries(genreCounts)
          .map(([name, count]) => ({
            name,
            count: count as number,
            percentage: Math.round(((count as number) / totalGenres) * 100)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        // For statistics, we'll use some approximations since actual listening time
        // requires more complex API calls
        const tracksCount = topTracksData.items.length;
        const uniqueArtistsCount = new Set(
          topTracksData.items.flatMap(track => track.artists.map(artist => artist.id))
        ).size;
        
        // Estimate listening time (assuming average track is ~3 minutes)
        const estimatedListeningTime = tracksCount * 3;
        
        // Compile all the data
        const statsData: SpotifyStats = {
          user: {
            displayName: userData.display_name
          },
          topArtists: {
            shortTerm: topArtistsData.items.map((artist: SpotifyArtist) => ({
              id: artist.id,
              name: artist.name,
              imageUrl: artist.images[0]?.url || '',
              popularity: artist.popularity
            }))
          },
          topTracks: {
            shortTerm: topTracksData.items.map((track: SpotifyTrack) => ({
              id: track.id,
              name: track.name,
              artists: track.artists.map((artist: SpotifyArtist) => artist.name),
              albumImageUrl: track.album.images[0]?.url || '',
              popularity: track.popularity
            }))
          },
          genres: {
            shortTerm: genreDistribution
          },
          stats: {
            shortTerm: {
              listeningTime: estimatedListeningTime,
              tracksCount: tracksCount,
              uniqueArtistsCount: uniqueArtistsCount
            }
          }
        };
        
        console.log("Stats data compiled:", {
          artistsCount: statsData.topArtists?.shortTerm.length,
          tracksCount: statsData.topTracks?.shortTerm.length,
          firstTrack: statsData.topTracks?.shortTerm[0]
        });
        
        setData(statsData);
        
        // Optionally, store this data in Firebase for later use
        // This would require implementing the Firebase storage logic
        
      } catch (err) {
        console.error("Error fetching Spotify data:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch statistics"));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSpotifyData();
  }, [spotifyToken]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorView message={`Failed to load your statistics: ${error.message}`} />;
  }

  // Add null check for data
  if (!data) {
    return <ErrorView message="No statistics data available" />;
  }

  const handleNowPlayingPress = () => {
    if (currentTrack) {
      router.push("/(tabs)/now-playing");
    }
  };

  // Extract top artists and tracks with null checks
  const topArtists = data?.topArtists?.shortTerm || [];
  const topTracks = data?.topTracks?.shortTerm || [];
  const genreDistribution = data?.genres?.shortTerm || [];
  
  // Calculate stats with null checks
  const listeningTime = data?.stats?.shortTerm?.listeningTime || 0;
  const topGenre = genreDistribution.length > 0 ? genreDistribution[0].name : "Unknown";
  const trackCount = data?.stats?.shortTerm?.tracksCount || 0;
  const artistCount = data?.stats?.shortTerm?.uniqueArtistsCount || 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.greeting}>Hello, {data?.user?.displayName || "Music Lover"}</Text>
            <Text style={styles.title}>Your Music Stats</Text>
            
            {currentTrack && (
              <TouchableOpacity 
                style={styles.nowPlayingBanner}
                onPress={handleNowPlayingPress}
              >
                <Image 
                  source={{ uri: currentTrack.albumImageUrl }} 
                  style={styles.nowPlayingImage} 
                  contentFit="cover"
                />
                <View style={styles.nowPlayingInfo}>
                  <Text style={styles.nowPlayingTitle}>
                    {isPlaying ? "Now Playing" : "Paused"}
                  </Text>
                  <Text style={styles.nowPlayingTrack} numberOfLines={1}>
                    {currentTrack.name} • {currentTrack.artists[0]}
                  </Text>
                </View>
                <Ionicons name="musical-notes-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsCards}>
            <StatCard 
              title="Minutes Listened" 
              value={listeningTime.toString()} 
              icon={<Ionicons name="time-outline" size={24} color={Colors.primary} />}
            />
            <StatCard 
              title="Top Genre" 
              value={topGenre} 
              icon={<Ionicons name="musical-notes-outline" size={24} color={Colors.primary} />}
            />
          </View>

          <View style={styles.statsCards}>
            <StatCard 
              title="Tracks" 
              value={trackCount.toString()} 
              icon={<Ionicons name="disc-outline" size={24} color={Colors.primary} />}
            />
            <StatCard 
              title="Artists" 
              value={artistCount.toString()} 
              icon={<Ionicons name="trending-up-outline" size={24} color={Colors.primary} />}
            />
          </View>

          <TopItemsList 
            title="Top Artists" 
            items={topArtists} 
            type="artist"
          />

          <TopItemsList 
            title="Top Tracks" 
            items={topTracks.map((track: {
              id: string;
              name: string;
              artists: string[];
              albumImageUrl: string;
              popularity: number;
            }) => ({
              id: track.id,
              name: track.name,
              artist: track.artists.join(', '), // Convert array to string
              imageUrl: track.albumImageUrl,
              popularity: track.popularity
            }))} 
            type="track"
          />

          {genreDistribution.length > 0 && (
            <View style={styles.genreSection}>
              <Text style={styles.sectionTitle}>Genre Distribution</Text>
              <GenreDistribution data={genreDistribution} />
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 20,
  },
  nowPlayingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  nowPlayingImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 2,
  },
  nowPlayingTrack: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  statsCards: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  genreSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
  },
  spacer: {
    height: 100,
  },
});