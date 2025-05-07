import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { usePlayerStore } from '../../store/player-store';
import Colors from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAuth } from '../../context/auth-context';
import Slider from '@react-native-community/slider';

export default function NowPlayingScreen() {
  const router = useRouter();
  const { user, isPremium, refreshSpotifyToken } = useSafeAuth(); // Get all values from auth
  
  const { 
    currentTrack, 
    isPlaying, 
    isLoading,
    playbackPosition,
    playbackDuration,
    playTrack, 
    pauseTrack, 
    resumeTrack,
    openInSpotify,
    skipToNextOnSpotifyConnect,
    skipToPreviousOnSpotifyConnect,
    seekToPosition,
    isSpotifyConnectActive,
    toggleSpotifyConnectActive,
    fetchSpotifyDevices,
    spotifyDevices,
    activeDevice,
    webPlayerReady,
    webPlayerVisible,
    toggleWebPlayerVisibility,
    syncPlaybackState,
    setAuthContext,
    error: playerError,
    // Initialize player like in playlist
    initWebPlayer,
    connectWebPlayer,
    shuffleActive,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode 
  } = usePlayerStore();

  const [showDevices, setShowDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Set up auth context for player store (simplified like in playlist)
  useEffect(() => {
    setAuthContext({
      refreshSpotifyToken: refreshSpotifyToken
    });

    return () => {
      setAuthContext(null);
    };
  }, [refreshSpotifyToken, setAuthContext]);

  // Initialize Web Playback SDK on web platform (from playlist pattern)
  useEffect(() => {
    if (Platform.OS === 'web' && isPremium) {
      const setupWebPlayer = async () => {
        await initWebPlayer();
        await connectWebPlayer();
      };
      
      setupWebPlayer();
    }
  }, [isPremium]);

  // Fetch Spotify devices for iOS (from playlist pattern)
  useEffect(() => {
    if (Platform.OS === 'ios' && isPremium) {
      fetchSpotifyDevices();
    }
  }, [isPremium]);

  // Listen for player errors
  useEffect(() => {
    if (playerError) {
      console.error('Player error:', playerError);
      if (playerError.includes('token')) {
        setDeviceError('Token expired. Please retry.');
      } else {
        setDeviceError(playerError);
      }
    }
  }, [playerError]);

  // If no track is playing, show a message
  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No track is currently playing</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => router.push('/trips')}
            >
              <Text style={styles.browseButtonText}>Browse Trips</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseTrack();
        return;
      }

      // Check playability based on platform (from playlist pattern)
      const isPlayable = Platform.OS === 'web' ? 
        (webPlayerReady && isPremium && currentTrack.uri) || currentTrack.preview_url : 
        Platform.OS === 'ios' ?
        (isSpotifyConnectActive && isPremium && currentTrack.uri) || currentTrack.preview_url :
        currentTrack.preview_url;

      if (isPlayable) {
        resumeTrack();
      } else {

        // If we've already loaded an Audio.Sound, just resume...
        const { sound } = usePlayerStore.getState();
        if (sound) {
          await resumeTrack();
          return;
        }

        // otherwise start fresh playback
        await playTrack({
          ...currentTrack,
          // optionally pass playlistId/Name here
        });
        return;
      }
    } catch (error) {
      console.error('Error in handlePlayPause:', error);
      Alert.alert('Playback Error', 'Unable to play this track. Please try again.');
    }
  };

  const handleShuffle = async () => {
    try {
      await toggleShuffle(!shuffleActive);
    } catch (err) {
      console.error(err);
      Alert.alert("Shuffle Error", "Couldn’t toggle shuffle.");
    }
  };

  const handleRepeat = async () => {
    try {
      await cycleRepeatMode(); // store should pick next of off→context→track→off
    } catch (err) {
      console.error(err);
      Alert.alert("Repeat Error", "Couldn’t change repeat mode.");
    }
  };

  const handleSkipNext = async () => {
    if (Platform.OS === 'ios' && isSpotifyConnectActive) {
      skipToNextOnSpotifyConnect();
    }
  };

  const handleSkipPrevious = async () => {
    if (Platform.OS === 'ios' && isSpotifyConnectActive) {
      skipToPreviousOnSpotifyConnect();
    }
  };

  const handleOpenInSpotify = async () => {
    if (currentTrack.uri) {
      await openInSpotify(currentTrack.uri);
    }
  };

  const handleSeek = (value: number) => {
    seekToPosition(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDevicePress = () => {
    setShowDevices(!showDevices);
    fetchSpotifyDevices();
  };

  const handleDeviceSelect = (deviceId: string) => {
    usePlayerStore.getState().transferPlayback(deviceId);
    setShowDevices(false);
  };

  // Check if track is playable (from playlist pattern)
  const isTrackPlayable = Platform.OS === 'web' ? 
    (webPlayerReady && isPremium && currentTrack.uri) || currentTrack.preview_url : 
    Platform.OS === 'ios' ?
    (isSpotifyConnectActive && isPremium && currentTrack.uri) || currentTrack.preview_url :
    currentTrack.preview_url;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Now Playing</Text>
            {currentTrack.playlistName && (
              <TouchableOpacity 
                onPress={() => currentTrack.playlistId && router.push(`/playlist/${currentTrack.playlistId}`)}
              >
                <Text style={styles.playlistName}>From: {currentTrack.playlistName}</Text>
              </TouchableOpacity>
            )}
          </View>

          {Platform.OS === 'ios' && isPremium && (
            <View style={styles.deviceSelection}>
              <TouchableOpacity 
                style={styles.deviceSelector}
                onPress={handleDevicePress}
              >
                {isSpotifyConnectActive && activeDevice ? (
                  <Text style={styles.deviceText}>
                    Playing on: {activeDevice.name}
                  </Text>
                ) : (
                  <Text style={styles.deviceText}>Select Device</Text>
                )}
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              
              {showDevices && spotifyDevices.length > 0 && (
                <View style={styles.devicesList}>
                  {spotifyDevices.map(device => (
                    <TouchableOpacity
                      key={device.id}
                      style={[
                        styles.deviceItem,
                        device.is_active && styles.activeDevice
                      ]}
                      onPress={() => handleDeviceSelect(device.id)}
                    >
                      <Text style={styles.deviceItemText}>{device.name}</Text>
                      <Text style={styles.deviceType}>{device.type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {deviceError && (
                <Text style={styles.errorText}>{deviceError}</Text>
              )}
            </View>
          )}

          <View style={styles.albumContainer}>
            <Image 
              source={{ uri: currentTrack.albumImageUrl }} 
              style={styles.albumImage} 
              contentFit="cover"
            />
          </View>

          <View style={styles.trackInfo}>
            <Text style={styles.trackName}>{currentTrack.name}</Text>
            <Text style={styles.artistName}>{currentTrack.artists.join(", ")}</Text>
            <Text style={styles.albumName}>{currentTrack.albumName}</Text>
          </View>

          <View style={styles.progressContainer}>
            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={playbackDuration > 0 ? playbackDuration : 30}
              value={playbackPosition}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.divider}
              thumbTintColor={Colors.primary}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(playbackDuration > 0 ? playbackDuration : 30)}</Text>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.secondaryControl} onPress={handleShuffle}>
              <Ionicons
                name={shuffleActive ? "shuffle" : "shuffle-outline"}
                size={24}
                color={shuffleActive ? Colors.accent : Colors.textSecondary}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mainControl}
              onPress={handleSkipPrevious}
              disabled={!(Platform.OS === 'ios' && isSpotifyConnectActive)}
            >
              <Ionicons name="play-skip-back" size={28} color={Colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.playButton,
                (!isTrackPlayable) && styles.disabledButton
              ]} 
              onPress={handlePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : isPlaying ? (
                <Ionicons name="pause" size={32} color={Colors.text} />
              ) : (
                <Ionicons name="play" size={32} color={Colors.text} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mainControl}
              onPress={handleSkipNext}
              disabled={!(Platform.OS === 'ios' && isSpotifyConnectActive)}
            >
              <Ionicons name="play-skip-forward" size={28} color={Colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryControl}>
              <Ionicons name="repeat-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleOpenInSpotify}
            >
              <Ionicons name="open-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!isPremium && (
            <View style={styles.premiumNotice}>
              <Ionicons name="star" size={16} color={Colors.accent} style={styles.premiumIcon} />
              <Text style={styles.premiumText}>
                {currentTrack.preview_url ? 
                  'Playing 30s preview - Premium required for full tracks' :
                  'Premium required for full track playback'
                }
              </Text>
            </View>
          )}

          {Platform.OS === 'web' && isPremium && currentTrack.uri && !webPlayerVisible && (
            <TouchableOpacity 
              style={styles.webPlayerButton} 
              onPress={toggleWebPlayerVisibility}
            >
              <Text style={styles.webPlayerText}>Enable Full Tracks</Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  playlistName: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 16,
  },
  albumContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  albumImage: {
    width: 300,
    height: 300,
    borderRadius: 8,
  },
  trackInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  trackName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  albumName: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  progressBar: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  secondaryControl: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainControl: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  disabledButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  actionButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  deviceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deviceText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  deviceButton: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
  },
  deviceButtonText: {
    fontSize: 12,
    color: Colors.text,
  },
  webPlayerButton: {
    alignSelf: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  webPlayerText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    height: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  deviceSelection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  deviceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    padding: 12,
    borderRadius: 8,
  },
  devicesList: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  deviceItem: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  activeDevice: {
    backgroundColor: Colors.primary + '30',
  },
  deviceItemText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  deviceType: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  noDevicesText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 12,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 8,
  },
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  premiumIcon: {
    marginRight: 8,
  },
  premiumText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});