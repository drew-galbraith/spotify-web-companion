import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Play, Pause, Heart, Clock, ArrowLeft, MapPin, Music2, ExternalLink, Smartphone } from "lucide-react-native";
import Colors from "../../constants/colors";
import { useTravelPlaylist } from "../../hooks/use-travel-playlist";
import { usePlayerStore } from "../../store/player-store";
import { useAuth } from "../../context/auth-context";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import TrackListItem from "../../components/track-list-item";
import PlayerControls from "../../components/player-controls";

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPremium } = useAuth();
  const { data: playlist, isLoading, error } = useTravelPlaylist(id);
  const { 
    currentTrack, 
    isPlaying, 
    isLoading: isPlayerLoading,
    playTrack, 
    pauseTrack,
    openInSpotify,
    // Web Playback SDK methods
    initWebPlayer,
    connectWebPlayer,
    webPlayerReady,
    // Spotify Connect methods
    isSpotifyConnectActive,
    toggleSpotifyConnectActive,
    fetchSpotifyDevices,
    spotifyDevices,
    activeDevice
  } = usePlayerStore();

  const [showDevices, setShowDevices] = useState(false);

  // Ensure the player is visible when viewing a playlist
  useEffect(() => {
    if (playlist) {
      usePlayerStore.getState().showPlayer();
    }
  }, [playlist]);

  // Initialize Web Playback SDK on web platform
  useEffect(() => {
    if (Platform.OS === 'web' && isPremium) {
      const setupWebPlayer = async () => {
        await initWebPlayer();
        await connectWebPlayer();
      };
      
      setupWebPlayer();
    }
  }, [isPremium]);

  // Fetch Spotify devices for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && isPremium) {
      fetchSpotifyDevices();
    }
  }, [isPremium]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !playlist) {
    return <ErrorView message="Failed to load playlist" />;
  }

  const handlePlayPause = () => {
    if (isPlaying && currentTrack?.id === playlist.tracks[0]?.id) {
      pauseTrack();
    } else if (playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0]);
    }
  };

  const handleTrackPress = (track: any) => {
    playTrack(track);
  };

  const handleOpenInSpotify = async () => {
    if (playlist.uri) {
      await openInSpotify(playlist.uri);
    }
  };

  const handleDevicePress = () => {
    setShowDevices(!showDevices);
    fetchSpotifyDevices();
  };

  const handleDeviceSelect = (deviceId: string) => {
    usePlayerStore.getState().transferPlayback(deviceId);
    setShowDevices(false);
  };

  // Find the first playable track
  const firstPlayableTrack = playlist.tracks && playlist.tracks.length > 0 ? 
    playlist.tracks.find(track => 
      Platform.OS === 'web' ? 
        (webPlayerReady && isPremium && track.uri) || track.preview_url : 
        Platform.OS === 'ios' ?
        (isSpotifyConnectActive && isPremium && track.uri) || track.preview_url :
        track.preview_url
    ) : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            
            <View style={styles.playlistInfo}>
              <Image
                source={{ uri: playlist.imageUrl }}
                style={styles.playlistImage}
                contentFit="cover"
              />
              
              <View style={styles.playlistDetails}>
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <View style={styles.playlistMeta}>
                  <MapPin size={16} color={Colors.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.playlistLocation}>{playlist.location || "Travel Playlist"}</Text>
                </View>
                <View style={styles.playlistMeta}>
                  <Music2 size={16} color={Colors.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.playlistTrackCount}>{playlist.tracks ? playlist.tracks.length : 0} tracks</Text>
                </View>
                
                {Platform.OS === 'ios' && isSpotifyConnectActive && activeDevice && (
                  <View style={styles.playlistMeta}>
                    <Smartphone size={16} color={Colors.accent} style={styles.metaIcon} />
                    <Text style={styles.playlistDevice}>Playing on: {activeDevice.name}</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.playlistActions}>
              <TouchableOpacity 
                style={[
                  styles.playButton,
                  (!firstPlayableTrack || isPlayerLoading) && styles.disabledButton
                ]}
                onPress={handlePlayPause}
                disabled={!firstPlayableTrack || isPlayerLoading}
              >
                {isPlayerLoading ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : isPlaying && currentTrack?.id === (playlist.tracks && playlist.tracks.length > 0 ? playlist.tracks[0]?.id : null) ? (
                  <Pause size={24} color={Colors.text} />
                ) : (
                  <Play size={24} color={Colors.text} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.heartButton}>
                <Heart size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.spotifyButton}
                onPress={handleOpenInSpotify}
              >
                <ExternalLink size={20} color={Colors.text} />
              </TouchableOpacity>
              
              {Platform.OS === 'ios' && isPremium && (
                <TouchableOpacity 
                  style={styles.deviceButton}
                  onPress={handleDevicePress}
                >
                  <Smartphone size={20} color={Colors.text} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Device selection dropdown for iOS */}
            {Platform.OS === 'ios' && showDevices && spotifyDevices.length > 0 && (
              <View style={styles.devicesDropdown}>
                <Text style={styles.devicesTitle}>Available Devices</Text>
                {spotifyDevices.map(device => (
                  <TouchableOpacity 
                    key={device.id}
                    style={[
                      styles.deviceItem,
                      device.is_active && styles.activeDeviceItem
                    ]}
                    onPress={() => handleDeviceSelect(device.id)}
                  >
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceType}>{device.type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Progress bar for iOS Spotify Connect */}
            {Platform.OS === 'ios' && isSpotifyConnectActive && isPlaying && (
              <View style={styles.progressContainer}>
                <PlayerControls compact={true} showProgress={true} />
              </View>
            )}
          </View>
        </LinearGradient>
        
        <FlatList
          data={playlist.tracks || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackListItem
              track={item}
              index={index}
              onPress={() => handleTrackPress(item)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderNumber}>#</Text>
                <Text style={styles.listHeaderTitle}>TITLE</Text>
                <Clock size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.divider} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tracks in this playlist</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContent: {
    gap: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  playlistInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  playlistImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  playlistDetails: {
    flex: 1,
  },
  playlistName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  playlistMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaIcon: {
    marginRight: 6,
  },
  playlistLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  playlistTrackCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  playlistDevice: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "500",
  },
  playlistActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  heartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
  },
  spotifyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "Colors.primary", // Spotify green
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  deviceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  listHeaderNumber: {
    width: 30,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  listHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 100, // Extra space for player
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  devicesDropdown: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  devicesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 2,
  },
  activeDeviceItem: {
    backgroundColor: Colors.primary + '40', // Add transparency
  },
  deviceName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  deviceType: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressContainer: {
    marginTop: 8,
  },
});