import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player-store';
import { useSafeAuth } from '../context/auth-context';
import Slider from '@react-native-community/slider';

interface PlayerControlsProps {
  compact?: boolean;
  showProgress?: boolean;
}

export default function PlayerControls({ compact = false, showProgress = false }: PlayerControlsProps) {
  const { isPremium } = useSafeAuth();
  const { 
    currentTrack, 
    isPlaying, 
    isLoading,
    playbackPosition,
    playbackDuration,
    pauseTrack, 
    resumeTrack,
    openInSpotify,
    skipToNextOnSpotifyConnect,
    skipToPreviousOnSpotifyConnect,
    seekToPosition,
    isSpotifyConnectActive,
    toggleSpotifyConnectActive,
    fetchSpotifyDevices,
    webPlayerReady,
    webPlayerVisible,
    toggleWebPlayerVisibility,
    activeDevice,
    spotifyDevices
  } = usePlayerStore();

  if (!currentTrack) return null;

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseTrack();
        return;
      }

      // Different logic for premium vs free users
      if (isPremium && currentTrack.uri) {
        if (Platform.OS === 'ios') {
          // Initialize Spotify Connect if not active
          if (!isSpotifyConnectActive) {
            toggleSpotifyConnectActive();
            
            // Check if we have any devices available
            await fetchSpotifyDevices();
            
            if (spotifyDevices.length === 0) {
              Alert.alert(
                'No Devices Found',
                'Please open Spotify on another device first.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
          await resumeTrack();
        } else if (Platform.OS === 'web') {
          // Initialize Web Playback SDK if not ready
          if (!webPlayerReady) {
            if (!webPlayerVisible) {
              toggleWebPlayerVisibility();
            }
            // Add a small delay for initialization
            setTimeout(() => resumeTrack(), 1000);
          } else {
            await resumeTrack();
          }
        } else if (currentTrack.preview_url) {
          // Fallback to preview for other platforms
          await resumeTrack();
        } else {
          // If all else fails, open in Spotify
          handleOpenInSpotify();
        }
      } else if (currentTrack.preview_url) {
        // Free users can only play previews
        await resumeTrack();
      } else {
        // No preview available, open in Spotify
        Alert.alert(
          isPremium ? 'Full Track Not Available' : 'Premium Required',
          isPremium ? 
            'This track cannot be played in the app. Would you like to open it in Spotify?' :
            'Full track playback requires a Spotify Premium account.',
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

  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Determine if the track is playable
  const hasPreview = !!currentTrack.preview_url;
  const hasUri = !!currentTrack.uri;
  const isPlayable = Platform.OS === 'web' ? 
    (webPlayerReady && isPremium && hasUri) || hasPreview : 
    Platform.OS === 'ios' ?
    (isSpotifyConnectActive && isPremium && hasUri) || hasPreview :
    hasPreview;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {isLoading ? (
          <View style={styles.compactPlayButton}>
            <ActivityIndicator size="small" color={Colors.text} />
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.compactPlayButton,
              (!isPlayable && !currentTrack.uri) && styles.disabledButton
            ]} 
            onPress={handlePlayPause}
            disabled={isLoading}
          >
            {isPlaying ? (
              <Ionicons name="pause" size={16} color={Colors.text} />
            ) : (
              <Ionicons name="play" size={16} color={Colors.text} />
            )}
          </TouchableOpacity>
        )}
        
        {Platform.OS === 'ios' && isPremium && isSpotifyConnectActive && activeDevice && (
          <View style={styles.compactDeviceIndicator}>
            <Ionicons name="phone-portrait-outline" size={14} color={Colors.accent} />
          </View>
        )}
        
        {!isPremium && (
          <View style={styles.compactPreviewBadge}>
            <Text style={styles.previewText}>Preview</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showProgress && (
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
      )}
      
      <View style={styles.controlsContainer}>
        {Platform.OS === 'ios' && isPremium && hasUri && !isSpotifyConnectActive && (
          <TouchableOpacity 
            style={styles.deviceButton} 
            onPress={() => {
              Alert.alert(
                'Enable Spotify Connect',
                'Would you like to enable full track playback using Spotify Connect?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Enable', 
                    onPress: () => {
                      toggleSpotifyConnectActive();
                      fetchSpotifyDevices();
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleSkipPrevious}
          disabled={!(Platform.OS === 'ios' && isSpotifyConnectActive)}
        >
          <Ionicons name="play-skip-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        {isLoading ? (
          <View style={styles.playButton}>
            <ActivityIndicator size="small" color={Colors.text} />
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.playButton,
              (!isPlayable && !currentTrack.uri) && styles.disabledButton
            ]} 
            onPress={handlePlayPause}
            disabled={isLoading}
          >
            {isPlaying ? (
              <Ionicons name="pause" size={24} color={Colors.text} />
            ) : (
              <Ionicons name="play" size={24} color={Colors.text} />
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleSkipNext}
          disabled={!(Platform.OS === 'ios' && isSpotifyConnectActive)}
        >
          <Ionicons name="play-skip-forward" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        {Platform.OS === 'web' && isPremium && hasUri && !webPlayerVisible && (
          <TouchableOpacity 
            style={styles.webPlayerButton} 
            onPress={toggleWebPlayerVisibility}
          >
            <Text style={styles.webPlayerText}>Enable Full Tracks</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  progressContainer: {
    marginBottom: 10,
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
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: Colors.secondary,
    opacity: 0.7,
  },
  deviceButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  webPlayerButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  webPlayerText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactControlButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  compactDeviceIndicator: {
    width: 24,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  compactPreviewBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  previewText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '500',
  },
});