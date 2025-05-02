import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Colors from "../../constants/colors";
import { useSpotifyStats } from "../../hooks/use-spotify-stats";
import { Ionicons } from "@expo/vector-icons";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import StatCard from "../../components/stat-card";
import TopItemsList from "../../components/top-items-list";
import GenreDistribution from "../../components/genre-distribution";
import { usePlayerStore } from "../../store/player-store";
import { useRouter } from "expo-router";

export default function StatsScreen() {
  const { data, isLoading, error } = useSpotifyStats();
  const { currentTrack, isPlaying } = usePlayerStore();
  const router = useRouter();

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
            items={topTracks} 
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