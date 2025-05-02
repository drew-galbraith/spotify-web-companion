import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Platform, useState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Play, Pause, Heart, Clock, ArrowLeft, ExternalLink, Smartphone } from "lucide-react-native";
import Colors from "../../constants/colors";
import { useSpotifyAlbum } from "../../hooks/use-spotify-album";
import { usePlayerStore } from "../../store/player-store";
import { useAuth } from "../../context/auth-context";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import { LinearGradient } from "expo-linear-gradient";
import TrackListItem from "../../components/track-list-item";
import { useEffect } from "react";
import PlayerControls from "../../components/player-controls";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPremium } = useAuth();
  const { data: album, isLoading, error } = useSpotifyAlbum(id);
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack,
    openInSpotify,
    webPlayerReady,
    // Spotify Connect methods
    isSpotifyConnectActive,
    toggleSpotifyConnectActive,
    fetchSpotifyDevices,
    spotifyDevices,
    activeDevice
  } = usePlayerStore();

  const [showDevices, setShowDevices] = useState(false);

  // Ensure the player is visible when viewing an album
  useEffect(() => {
    if (album) {
      usePlayerStore.getState().showPlayer();
    }
  }, [album]);

  // Fetch Spotify devices for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && isPremium) {
      fetchSpotifyDevices();
    }
  }, [isPremium]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !album) {
    return <ErrorView message="Failed to load album" />;
  }

  const handlePlayPause = () => {
    if (isPlaying && currentTrack?.id === album.tracks[0]?.id) {
      pauseTrack();
    } else if (album.tracks.length > 0) {
      playTrack(album.tracks[0]);
    }
  };

  const handleTrackPress = (track: any) => {
    playTrack(track);
  };

  const handleOpenInSpotify = async () => {
    if (album.uri) {
      await openInSpotify(album.uri);
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
  const firstPlayableTrack = album.tracks.find(track => 
    Platform.OS === 'web' ? 
      (webPlayerReady && isPremium && track.uri) || track.preview_url : 
      Platform.OS === 'ios' ?
      (isSpotifyConnectActive && isPremium && track.uri) || track.preview_url :
      track.preview_url
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <FlatList
          data={album.tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackListItem 
              track={item} 
              index={index} 
              showIndex={true}
              onPress={() => handleTrackPress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <Image 
                source={{ uri: album.imageUrl }} 
                style={styles.albumImage} 
                contentFit="cover"
              />
              
              <View style={styles.albumInfo}>
                <Text style={styles.albumType}>ALBUM</Text>
                <Text style={styles.albumName}>{album.name}</Text>
                <View style={styles.albumMeta}>
                  <Image 
                    source={{ uri: album.artistImageUrl || album.imageUrl }} 
                    style={styles.artistImage} 
                    contentFit="cover"
                  />
                  <Text style={styles.albumArtist}>{album.artists.join(", ")}</Text>
                </View>
                <Text style={styles.albumDetails}>
                  {album.releaseDate?.substring(0, 4) || "Unknown"} • {album.tracks.length} songs • {album.duration}
                </Text>
                
                {Platform.OS === 'ios' && isSpotifyConnectActive && activeDevice && (
                  <View style={styles.deviceInfo}>
                    <Smartphone size={16} color={Colors.accent} style={styles.deviceIcon} />
                    <Text style={styles.deviceText}>Playing on: {activeDevice.name}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.controls}>
                <TouchableOpacity style={styles.heartButton}>
                  <Heart size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.playButton,
                    !firstPlayableTrack && styles.disabledPlayButton
                  ]} 
                  onPress={handlePlayPause}
                  disabled={!firstPlayableTrack}
                >
                  {isPlaying && currentTrack?.id === album.tracks[0]?.id ? (
                    <Pause size={30} color={Colors.text} />
                  ) : (
                    <Play size={30} color={Colors.text} />
                  )}
                </TouchableOpacity>
                
                {Platform.OS !== 'web' && album.uri && (
                  <TouchableOpacity 
                    style={styles.spotifyButton} 
                    onPress={handleOpenInSpotify}
                  >
                    <ExternalLink size={24} color={Colors.text} />
                  </TouchableOpacity>
                )}
                
                {Platform.OS === 'ios' && isPremium && (
                  <TouchableOpacity 
                    style={styles.deviceButton}
                    onPress={handleDevicePress}
                  >
                    <Smartphone size={24} color={Colors.textSecondary} />
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
              
              <View style={styles.trackHeader}>
                <Text style={styles.trackHeaderTitle}># TITLE</Text>
                <Clock size={16} color={Colors.textSecondary} />
              </View>
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
  backButton: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 150, // Extra padding for mini player
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  albumImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 24,
  },
  albumInfo: {
    marginBottom: 24,
  },
  albumType: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  albumName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  albumMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  artistImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  albumArtist: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  albumDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  deviceIcon: {
    marginRight: 6,
  },
  deviceText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  heartButton: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  disabledPlayButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.7,
  },
  spotifyButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "Colors.primary", // Spotify green
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  deviceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  trackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  trackHeaderTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.textSecondary,
  },
  devicesDropdown: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
    marginBottom: 16,
  },
});