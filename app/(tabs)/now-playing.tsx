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
  const { isPremium } = useSafeAuth();
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
    syncPlaybackState
  } = usePlayerStore();

  const [showDevices, setShowDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Initialize Spotify Connect for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && isPremium && currentTrack) {
      fetchSpotifyDevices();
      syncPlaybackState();
    }
  }, [isPremium, currentTrack, fetchSpotifyDevices, syncPlaybackState]);

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
        pauseTrack();
        return;
      }

      // Different logic for premium vs free users
      if (isPremium && currentTrack.uri) {
        // Premium users can play any track
        if (Platform.OS === 'ios') {
          if (!isSpotifyConnectActive) {
            toggleSpotifyConnectActive();
            await fetchSpotifyDevices();
            
            if (spotifyDevices.length === 0) {
              setDeviceError('No Spotify devices found. Please open Spotify on another device.');
              return;
            }
          }
          resumeTrack();
        } else if (Platform.OS === 'web') {
          if (!webPlayerReady) {
            if (!webPlayerVisible) {
              toggleWebPlayerVisibility();
            }
            setTimeout(() => resumeTrack(), 1000);
          } else {
            resumeTrack();
          }
        } else if (currentTrack.preview_url) {
          resumeTrack();
        } else {
          handleOpenInSpotify();
        }
      } else if (currentTrack.preview_url) {
        // Free users can only play previews
        resumeTrack();
      } else {
        // No preview available, open in Spotify
        Alert.alert(
          isPremium ? 'Full Track Not Available' : 'Premium Required',
          isPremium ? 
            'This track cannot be played in the app. Would you like to open it in Spotify?' :
            'Full track playback requires a Spotify Premium account. You can play the preview or open in Spotify.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Spotify', onPress: handleOpenInSpotify }
          ]
        );
      }
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Playback Error', 'Unable to play this track. Please try again.');
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

  const handleSeek = (value: number) => {
    seekToPosition(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const hasPreview = !!currentTrack.preview_url;
  const hasUri = !!currentTrack.uri;
  const isPlayable = Platform.OS === 'web' ? 
    (webPlayerReady && isPremium && hasUri) || hasPreview : 
    Platform.OS === 'ios' ?
    (isSpotifyConnectActive && isPremium && hasUri) || hasPreview :
    hasPreview;

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
                onPress={() => setShowDevices(!showDevices)}
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
              
              {showDevices && (
                <View style={styles.devicesList}>
                  {spotifyDevices.map(device => (
                    <TouchableOpacity
                      key={device.id}
                      style={[
                        styles.deviceItem,
                        device.is_active && styles.activeDevice
                      ]}
                      onPress={() => {
                        usePlayerStore.getState().transferPlayback(device.id);
                        setShowDevices(false);
                      }}
                    >
                      <Text style={styles.deviceItemText}>{device.name}</Text>
                      <Text style={styles.deviceType}>{device.type}</Text>
                    </TouchableOpacity>
                  ))}
                  
                  {spotifyDevices.length === 0 && (
                    <Text style={styles.noDevicesText}>
                      No devices found. Open Spotify on another device.
                    </Text>
                  )}
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
            <TouchableOpacity style={styles.secondaryControl}>
              <Ionicons name="shuffle-outline" size={24} color={Colors.textSecondary} />
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
                (!isPlayable && !currentTrack.uri) && styles.disabledButton
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

          {Platform.OS === 'web' && isPremium && hasUri && !webPlayerVisible && (
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