import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player-store';
import { useAuth } from '../context/auth-context';
import Slider from '@react-native-community/slider';

interface PlayerControlsProps {
  compact?: boolean;
  showProgress?: boolean;
}

export default function PlayerControls({ compact = false, showProgress = false }: PlayerControlsProps) {
  const { isPremium, isAuthenticated } = useAuth();
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
    webPlayerReady,
    webPlayerVisible,
    toggleWebPlayerVisibility
  } = usePlayerStore();

  if (!currentTrack) return null;

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      if (Platform.OS === 'web' && webPlayerReady && isPremium && currentTrack.uri) {
        if (!webPlayerVisible) {
          toggleWebPlayerVisibility();
        }
        resumeTrack();
      } else if (Platform.OS === 'ios' && isPremium && currentTrack.uri) {
        if (!isSpotifyConnectActive) {
          toggleSpotifyConnectActive();
        }
        resumeTrack();
      } else if (currentTrack.preview_url) {
        resumeTrack();
      } else {
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
              !isPlayable && styles.disabledButton
            ]} 
            onPress={handlePlayPause}
            disabled={!isPlayable && !hasUri}
          >
            {isPlaying ? (
              <Ionicons name="pause" size={16} color={Colors.text} />
            ) : (
              <Ionicons name="play" size={16} color={Colors.text} />
            )}
          </TouchableOpacity>
        )}
        
        {!isPlayable && Platform.OS !== 'web' && currentTrack.uri && (
          <TouchableOpacity style={styles.compactControlButton} onPress={handleOpenInSpotify}>
            <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
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
        {Platform.OS === 'ios' && isPremium && hasUri && (
          <TouchableOpacity 
            style={styles.deviceButton} 
            onPress={() => {
              fetchSpotifyDevices();
              // Show device selection UI here
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
              !isPlayable && styles.disabledButton
            ]} 
            onPress={handlePlayPause}
            disabled={!isPlayable && !hasUri}
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
        
        {!isPlayable && Platform.OS !== 'web' && currentTrack.uri && (
          <TouchableOpacity style={styles.controlButton} onPress={handleOpenInSpotify}>
            <Ionicons name="open-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        
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
});