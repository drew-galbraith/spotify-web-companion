import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Play, Pause, Heart, MoreHorizontal, ArrowLeft, AlertCircle, ExternalLink, Smartphone } from "lucide-react-native";
import Colors from "../../constants/colors";
import { useSpotifyTrack } from "../../hooks/use-spotify-track";
import { usePlayerStore } from "../../store/player-store";
import { useAuth } from "../../context/auth-context";
import LoadingScreen from "../../components/loading-screen";
import ErrorView from "../../components/error-view";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import PlayerControls from "../../components/player-controls";

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isPremium } = useAuth();
  const { data: track, isLoading, error } = useSpotifyTrack(id);
  const { 
    currentTrack, 
    isPlaying, 
    isLoading: isPlayerLoading, 
    error: playerError,
    playTrack, 
    pauseTrack, 
    resumeTrack,
    openInSpotify,
    // Web Playback SDK methods
    webPlayerReady,
    webPlayerVisible,
    toggleWebPlayerVisibility,
    // Spotify Connect methods
    isSpotifyConnectActive,
    toggleSpotifyConnectActive,
    fetchSpotifyDevices,
    spotifyDevices,
    activeDevice
  } = usePlayerStore();

  const [showDevices, setShowDevices] = useState(false);

  // Ensure the player is visible when viewing a track
  useEffect(() => {
    if (track) {
      usePlayerStore.getState().showPlayer();
    }
  }, [track]);

  // Fetch Spotify devices for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && isPremium) {
      fetchSpotifyDevices();
    }
  }, [isPremium]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !track) {
    return <ErrorView message="Failed to load track" />;
  }

  const isCurrentTrack = currentTrack?.id === track.id;
  
  // Determine if the track is playable
  const hasPreview = !!track.preview_url;
  const hasUri = !!track.uri;
  const isPlayable = Platform.OS === 'web' ? 
    (webPlayerReady && isPremium && hasUri && webPlayerVisible) || hasPreview : 
    Platform.OS === 'ios' ?
    (isSpotifyConnectActive && isPremium && hasUri) || hasPreview :
    hasPreview;

  const handlePlayPause = () => {
    if (isCurrentTrack && isPlaying) {
      pauseTrack();
    } else if (isCurrentTrack) {
      resumeTrack();
    } else {
      playTrack(track);
    }
  };

  const handleOpenInSpotify = async () => {
    if (track.uri) {
      await openInSpotify(track.uri);
    }
  };

  const handleToggleWebPlayer = () => {
    toggleWebPlayerVisibility();
  };

  const handleToggleSpotifyConnect = () => {
    toggleSpotifyConnectActive();
  };

  const handleDevicePress = () => {
    setShowDevices(!showDevices);
    fetchSpotifyDevices();
  };

  const handleDeviceSelect = (deviceId: string) => {
    usePlayerStore.getState().transferPlayback(deviceId);
    setShowDevices(false);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[Colors.cardBackground, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.trackHeader}>
            <Image 
              source={{ uri: track.albumImageUrl }} 
              style={styles.trackImage} 
              contentFit="cover"
            />
            
            <View style={styles.trackInfo}>
              <Text style={styles.trackName}>{track.name}</Text>
              <Text style={styles.artistName}>{track.artists.join(", ")}</Text>
              <Text style={styles.albumName}>{track.album}</Text>
            </View>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity style={styles.heartButton}>
              <Heart size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            {isPlayerLoading && isCurrentTrack ? (
              <View style={styles.playButton}>
                <ActivityIndicator size="small" color={Colors.text} />
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.playButton, !isPlayable && !hasUri && styles.disabledPlayButton]} 
                onPress={handlePlayPause}
                disabled={!isPlayable && !hasUri}
              >
                {isCurrentTrack && isPlaying ? (
                  <Pause size={30} color={Colors.text} />
                ) : (
                  <Play size={30} color={Colors.text} />
                )}
              </TouchableOpacity>
            )}
            
            {!isPlayable && Platform.OS !== 'web' && track.uri && (
              <TouchableOpacity 
                style={styles.spotifyButton} 
                onPress={handleOpenInSpotify}
              >
                <ExternalLink size={24} color={Colors.text} />
              </TouchableOpacity>
            )}
            
            {Platform.OS === 'ios' && isPremium && hasUri && (
              <TouchableOpacity 
                style={styles.deviceButton}
                onPress={handleDevicePress}
              >
                <Smartphone size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.moreButton}>
              <MoreHorizontal size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
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
          
          {/* iOS Spotify Connect status */}
          {Platform.OS === 'ios' && isSpotifyConnectActive && activeDevice && (
            <View style={styles.connectStatusContainer}>
              <Text style={styles.connectStatusText}>
                Connected to {activeDevice.name} ({activeDevice.type})
              </Text>
            </View>
          )}
          
          {playerError && isCurrentTrack && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={Colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{playerError}</Text>
              
              {playerError.includes("Open in Spotify") && track.uri && Platform.OS !== 'web' && (
                <TouchableOpacity 
                  style={styles.openSpotifyButton}
                  onPress={handleOpenInSpotify}
                >
                  <Text style={styles.openSpotifyText}>Open in Spotify</Text>
                </TouchableOpacity>
              )}
              
              {playerError.includes("Enable web player") && Platform.OS === 'web' && isPremium && track.uri && (
                <TouchableOpacity 
                  style={styles.webPlayerButton}
                  onPress={handleToggleWebPlayer}
                >
                  <Text style={styles.webPlayerButtonText}>Enable Web Player</Text>
                </TouchableOpacity>
              )}
              
              {playerError.includes("Enable Spotify Connect") && Platform.OS === 'ios' && isPremium && track.uri && (
                <TouchableOpacity 
                  style={styles.webPlayerButton}
                  onPress={handleToggleSpotifyConnect}
                >
                  <Text style={styles.webPlayerButtonText}>Enable Spotify Connect</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Progress bar for iOS Spotify Connect */}
          {Platform.OS === 'ios' && isSpotifyConnectActive && isCurrentTrack && (
            <View style={styles.progressContainer}>
              <PlayerControls showProgress={true} />
            </View>
          )}
          
          <View style={styles.trackDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{formatDuration(track.duration_ms)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Album</Text>
              <Text style={styles.detailValue}>{track.album}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Release Date</Text>
              <Text style={styles.detailValue}>{track.releaseDate || "Unknown"}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Popularity</Text>
              <Text style={styles.detailValue}>{track.popularity || "N/A"}/100</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Preview Available</Text>
              <Text style={styles.detailValue}>{hasPreview ? "Yes" : "No"}</Text>
            </View>
            
            {Platform.OS === 'web' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Full Track</Text>
                <Text style={styles.detailValue}>
                  {webPlayerReady && isPremium && hasUri ? "Available" : "Not Available"}
                </Text>
              </View>
            )}
            
            {Platform.OS === 'ios' && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Spotify Connect</Text>
                <Text style={styles.detailValue}>
                  {isSpotifyConnectActive && isPremium && hasUri ? "Enabled" : "Available"}
                </Text>
              </View>
            )}
          </View>
          
          {Platform.OS === 'web' && isPremium && hasUri ? (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>
                {webPlayerVisible ? "Full Track Playback Enabled" : "Full Track Available"}
              </Text>
              
              <TouchableOpacity 
                style={styles.webPlayerButton}
                onPress={handleToggleWebPlayer}
              >
                <Text style={styles.webPlayerButtonText}>
                  {webPlayerVisible ? "Hide Web Player" : "Enable Full Track Playback"}
                </Text>
              </TouchableOpacity>
              
              {webPlayerVisible && (
                <TouchableOpacity 
                  style={styles.previewButton}
                  onPress={handlePlayPause}
                  disabled={isPlayerLoading}
                >
                  {isPlayerLoading && isCurrentTrack ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <Text style={styles.previewButtonText}>
                      {isCurrentTrack && isPlaying ? "Pause Track" : "Play Full Track"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              
              <Text style={styles.previewNote}>
                {webPlayerVisible ? 
                  "Playing full tracks with your Spotify Premium account" : 
                  "Enable web player to listen to full tracks"}
              </Text>
            </View>
          ) : Platform.OS === 'ios' && isPremium && hasUri ? (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>
                {isSpotifyConnectActive ? "Spotify Connect Enabled" : "Spotify Connect Available"}
              </Text>
              
              <TouchableOpacity 
                style={styles.webPlayerButton}
                onPress={handleToggleSpotifyConnect}
              >
                <Text style={styles.webPlayerButtonText}>
                  {isSpotifyConnectActive ? "Disable Spotify Connect" : "Enable Spotify Connect"}
                </Text>
              </TouchableOpacity>
              
              {isSpotifyConnectActive && (
                <TouchableOpacity 
                  style={styles.previewButton}
                  onPress={handlePlayPause}
                  disabled={isPlayerLoading}
                >
                  {isPlayerLoading && isCurrentTrack ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <Text style={styles.previewButtonText}>
                      {isCurrentTrack && isPlaying ? "Pause Track" : "Play Full Track"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              
              <Text style={styles.previewNote}>
                {isSpotifyConnectActive ? 
                  "Playing full tracks with your Spotify Premium account" : 
                  "Enable Spotify Connect to listen to full tracks"}
              </Text>
              
              {activeDevice && isSpotifyConnectActive && (
                <Text style={styles.deviceNote}>
                  Connected to: {activeDevice.name} ({activeDevice.type})
                </Text>
              )}
            </View>
          ) : hasPreview ? (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Preview Available</Text>
              <TouchableOpacity 
                style={styles.previewButton}
                onPress={handlePlayPause}
                disabled={isPlayerLoading}
              >
                {isPlayerLoading && isCurrentTrack ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.previewButtonText}>
                    {isCurrentTrack && isPlaying ? "Pause Preview" : "Play 30s Preview"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewSection}>
              <Text style={styles.noPreviewTitle}>No Preview Available</Text>
              <Text style={styles.noPreviewText}>
                This track doesn't have a preview available from Spotify.
                {Platform.OS === 'web' && isPremium && hasUri ? 
                  " Enable the web player for full playback." : 
                  Platform.OS === 'ios' && isPremium && hasUri ?
                  " Enable Spotify Connect for full playback." :
                  Platform.OS === 'web' && !isPremium ? 
                  " Log in with a Premium account for full playback." : 
                  ""}
              </Text>
              
              {Platform.OS === 'web' && isPremium && hasUri ? (
                <TouchableOpacity 
                  style={styles.webPlayerButton}
                  onPress={handleToggleWebPlayer}
                >
                  <Text style={styles.webPlayerButtonText}>
                    Enable Web Player
                  </Text>
                </TouchableOpacity>
              ) : Platform.OS === 'ios' && isPremium && hasUri ? (
                <TouchableOpacity 
                  style={styles.webPlayerButton}
                  onPress={handleToggleSpotifyConnect}
                >
                  <Text style={styles.webPlayerButtonText}>
                    Enable Spotify Connect
                  </Text>
                </TouchableOpacity>
              ) : Platform.OS !== 'web' && track.uri && (
                <TouchableOpacity 
                  style={styles.openSpotifyFullButton}
                  onPress={handleOpenInSpotify}
                >
                  <ExternalLink size={16} color={Colors.text} style={styles.openSpotifyIcon} />
                  <Text style={styles.openSpotifyFullText}>Open in Spotify</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Extra padding at bottom to avoid mini player overlap */}
          <View style={styles.bottomPadding} />
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
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150, // Extra padding to account for mini player
  },
  trackHeader: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
  },
  trackImage: {
    width: 240,
    height: 240,
    borderRadius: 8,
    marginBottom: 24,
  },
  trackInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  trackName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  artistName: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  albumName: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  spotifyButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "Colors.primary", // Spotify green
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  deviceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  disabledPlayButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  moreButton: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
    flexWrap: "wrap",
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  openSpotifyButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "Colors.primary", // Spotify green
    borderRadius: 12,
  },
  openSpotifyText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  webPlayerButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  webPlayerButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  trackDetails: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  previewSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  previewTitle: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
  },
  previewButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    minWidth: 180,
    alignItems: "center",
    marginTop: 16,
  },
  previewButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  previewNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
  },
  deviceNote: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  noPreviewTitle: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 8,
  },
  noPreviewText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  openSpotifyFullButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "Colors.primary", // Spotify green
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 8,
  },
  openSpotifyIcon: {
    marginRight: 8,
  },
  openSpotifyFullText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 80, // Extra padding at the bottom to avoid mini player overlap
  },
  progressContainer: {
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  devicesDropdown: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
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
  connectStatusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  connectStatusText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "500",
  },
});