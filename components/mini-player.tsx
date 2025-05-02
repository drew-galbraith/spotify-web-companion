import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator, Animated } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import Colors from "../constants/colors";
import { usePlayerStore } from "../store/player-store";
import { useAuth } from "../context/auth-context";

export default function MiniPlayer() {
  const router = useRouter();
  const { isPremium, isAuthenticated } = useAuth();
  const { 
    currentTrack, 
    isPlaying, 
    isLoading,
    error,
    isPlayerVisible,
    togglePlayerVisibility,
    hidePlayer,
    playTrack, 
    pauseTrack, 
    resumeTrack,
    openInSpotify,
    skipToNextOnSpotifyConnect,
    skipToPreviousOnSpotifyConnect,
    // Web Playback SDK methods
    initWebPlayer,
    connectWebPlayer,
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

  // Animation for sliding the player up/down
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Initialize Web Playback SDK on web platform
  useEffect(() => {
    if (Platform.OS === 'web' && isPremium && isAuthenticated && currentTrack) {
      const setupWebPlayer = async () => {
        await initWebPlayer();
        await connectWebPlayer();
      };
      
      setupWebPlayer();
    }
  }, [isPremium, isAuthenticated, currentTrack]);

  // Fetch Spotify devices for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && isPremium && isAuthenticated && currentTrack) {
      fetchSpotifyDevices();
    }
  }, [isPremium, isAuthenticated, currentTrack]);

  // Animate the player when visibility changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isPlayerVisible ? 0 : 100, // Slide down 100 pixels when hidden
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isPlayerVisible, slideAnim]);

  // Don't render if not authenticated or no track
  if (!isAuthenticated || !currentTrack) return null;

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else if (currentTrack) {
      if (Platform.OS === 'web' && webPlayerReady && isPremium && currentTrack.uri) {
        if (!webPlayerVisible) {
          // Show web player if it's not visible
          toggleWebPlayerVisibility();
        }
        resumeTrack();
      } else if (Platform.OS === 'ios' && isPremium && currentTrack.uri) {
        // For iOS, use Spotify Connect if available
        if (!isSpotifyConnectActive) {
          toggleSpotifyConnectActive();
        }
        resumeTrack();
      } else if (currentTrack.preview_url) {
        // For mobile or fallback, use the preview URL
        resumeTrack();
      } else if (Platform.OS === 'web' && isPremium && currentTrack.uri) {
        // For web with premium but web player not visible, show it
        toggleWebPlayerVisibility();
      } else if (Platform.OS === 'ios' && isPremium && currentTrack.uri) {
        // For iOS with premium but Spotify Connect not active, activate it
        toggleSpotifyConnectActive();
      } else {
        // If no playable source, try to open in Spotify
        handleOpenInSpotify();
      }
    }
  };

  const handleSkipNext = () => {
    if (Platform.OS === 'ios' && isSpotifyConnectActive) {
      skipToNextOnSpotifyConnect();
    }
  };

  const handleSkipPrevious = () => {
    if (Platform.OS === 'ios' && isSpotifyConnectActive) {
      skipToPreviousOnSpotifyConnect();
    }
  };

  const handleOpenInSpotify = async () => {
    if (currentTrack.uri) {
      await openInSpotify(currentTrack.uri);
    }
  };

  const handlePress = () => {
    router.push(`/(tabs)/now-playing`);
  };

  const handleClose = () => {
    hidePlayer();
  };

  const handleDevicePress = () => {
    if (Platform.OS === 'ios' && isPremium) {
      setShowDevices(!showDevices);
      fetchSpotifyDevices();
    }
  };

  // Determine if the track is playable
  const hasPreview = !!currentTrack.preview_url;
  const hasUri = !!currentTrack.uri;
  const isPlayable = Platform.OS === 'web' ? 
    (webPlayerReady && isPremium && hasUri) || hasPreview : 
    Platform.OS === 'ios' ?
    (isSpotifyConnectActive && isPremium && hasUri) || hasPreview :
    hasPreview;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.background]} />
      )}
      
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={togglePlayerVisibility}
      >
        {isPlayerVisible ? (
          <Ionicons Ionicons name="chevron-down" size={20} color={Colors.text} />
        ) : (
          <Ionicons Ionicons name="chevron-up" size={20} color={Colors.text} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
      >
        <Ionicons Ionicons name="close" size={20} color={Colors.text} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.contentContainer} 
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: currentTrack.albumImageUrl }} 
          style={styles.image} 
          contentFit="cover"
        />
        
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.name}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artists.join(", ")}</Text>
          {error && (
            <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
          )}
          {Platform.OS === 'ios' && isSpotifyConnectActive && activeDevice && (
            <Text style={styles.deviceText} numberOfLines={1}>
              Playing on: {activeDevice.name}
            </Text>
          )}
        </View>
        
        <View style={styles.controls}>
          {Platform.OS === 'web' && isPremium && hasUri && !webPlayerVisible && (
            <TouchableOpacity 
              style={styles.webPlayerButton} 
              onPress={toggleWebPlayerVisibility}
            >
              <Text style={styles.webPlayerText}>Enable Full Tracks</Text>
            </TouchableOpacity>
          )}
          
          {Platform.OS === 'ios' && isPremium && hasUri && (
            <TouchableOpacity 
              style={styles.deviceButton} 
              onPress={handleDevicePress}
            >
              <Ionicons Ionicons name="phone-portrait" size={20} color={Colors.text} />
            </TouchableOpacity>
          )}
          
          {!isPlayable && Platform.OS !== 'web' && currentTrack.uri && (
            <TouchableOpacity style={styles.controlButton} onPress={handleOpenInSpotify}>
              <Ionicons Ionicons name="open-outline" size={20} color={Colors.text} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleSkipPrevious}
            disabled={!(Platform.OS === 'ios' && isSpotifyConnectActive)}
          >
            <Ionicons Ionicons name="play-skip-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          
          {isLoading ? (
            <View style={styles.playButton}>
              <ActivityIndicator size="small" color={Colors.text} />
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.playButton,
                !isPlayable && styles.disabledButton
              ]} 
              onPress={handlePlayPause}
              disabled={!isPlayable && !hasUri}
            >
              {isPlaying ? (
                <Ionicons Ionicons name="pause" size={20} color={Colors.text} />
              ) : (
                <Ionicons Ionicons name="play" size={20} color={Colors.text} />
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleSkipNext}
            disabled={!(Platform.OS === 'ios' && isSpotifyConnectActive)}
          >
            <Ionicons Ionicons name="play-skip-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      
      {/* Spotify Connect Devices Dropdown for iOS */}
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
              onPress={() => {
                usePlayerStore.getState().transferPlayback(device.id);
                setShowDevices(false);
              }}
            >
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceType}>{device.type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80, // Positioned above tab bar
    left: 0,
    right: 0,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
    zIndex: 100, // Ensure it's above other content
  },
  background: {
    backgroundColor: Colors.cardBackground,
  },
  toggleButton: {
    position: 'absolute',
    top: 0,
    right: 32, // Moved to make room for close button
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 10,
    color: Colors.error,
    marginTop: 2,
  },
  deviceText: {
    fontSize: 10,
    color: Colors.accent,
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  disabledButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  webPlayerButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  webPlayerText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: "500",
  },
  deviceButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  devicesDropdown: {
    position: 'absolute',
    bottom: 70,
    left: 8,
    right: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    zIndex: 102,
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
});