import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Platform, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { usePlayerStore } from '../store/player-store';

interface Track {
  id: string;
  name: string;
  artists: string[];
  albumName?: string;
  albumImageUrl: string;
  duration_ms: number;
  preview_url?: string;
  uri: string;
  playlistId?: string;
  playlistName?: string;
}

interface TrackListItemProps {
  track: Track;
  index?: number;
  showArtwork?: boolean;
  showIndex?: boolean;
  onPress?: () => void;
  savedTracks?: { [key: string]: boolean };
  onToggleFavorite?: (trackId: string, newState: boolean) => void;
}

// iOS-style Playing Animation component
const PlayingAnimation = () => {
  const bar1 = useRef(new Animated.Value(8)).current;
  const bar2 = useRef(new Animated.Value(12)).current;
  const bar3 = useRef(new Animated.Value(10)).current;
  const bar4 = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, minHeight: number, maxHeight: number, duration: number) => {
      return Animated.sequence([
        Animated.timing(value, {
          toValue: maxHeight,
          duration: duration / 2,
          useNativeDriver: false,
        }),
        Animated.timing(value, {
          toValue: minHeight,
          duration: duration / 2,
          useNativeDriver: false,
        }),
      ]);
    };

    const runAnimation = () => {
      Animated.parallel([
        Animated.loop(createAnimation(bar1, 4, 12, 800), { iterations: -1 }),
        Animated.loop(createAnimation(bar2, 6, 14, 900), { iterations: -1 }),
        Animated.loop(createAnimation(bar3, 5, 12, 850), { iterations: -1 }),
        Animated.loop(createAnimation(bar4, 3, 10, 750), { iterations: -1 }),
      ]).start();
    };

    runAnimation();
  }, []);

  return (
    <View style={styles.playingAnimation}>
      <Animated.View style={[styles.bar, { height: bar1 }]} />
      <Animated.View style={[styles.bar, { height: bar2 }]} />
      <Animated.View style={[styles.bar, { height: bar3 }]} />
      <Animated.View style={[styles.bar, { height: bar4 }]} />
    </View>
  );
};

export default function TrackListItem({ 
  track, 
  index, 
  showArtwork = true, 
  showIndex = false,
  onPress 
}: TrackListItemProps) {
  const { 
    currentTrack, 
    isPlaying, 
    isLoading,
    playTrack,
    webPlayerReady
  } = usePlayerStore();

  const isActiveTrack = currentTrack?.id === track.id;
  
  // Determine if the track is playable
  const hasPreview = !!track.preview_url;
  const hasUri = !!track.uri;
  const isPlayable = Platform.OS === 'web' ? 
    (webPlayerReady && hasUri) || hasPreview : 
    hasPreview;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Ensure albumImageUrl is always defined
      const trackWithDefaults: Track = {
        ...track,
        albumImageUrl: track.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFsYnVtfGVufDB8fDB8fHww"
      };
      playTrack(trackWithDefaults);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Accessibility label based on track state
  const accessibilityLabel = `${track.name} by ${track.artists.join(", ")}. Duration ${formatDuration(track.duration_ms)}. ${
    isActiveTrack ? (isPlaying ? 'Now playing' : 'Paused') : ''
  }${isPlayable ? '' : 'Not available for preview'}`;

  return (
    <TouchableOpacity 
      style={[styles.container, isActiveTrack && styles.activeContainer]} 
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading && isActiveTrack}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ 
        selected: isActiveTrack,
        busy: isLoading && isActiveTrack 
      }}
    >
      {showIndex && index !== undefined && (
        <View style={styles.indexContainer}>
          {isActiveTrack && isPlaying ? (
            <PlayingAnimation />
          ) : (
            <Text style={[styles.index, isActiveTrack && styles.activeText]}>
              {index + 1}
            </Text>
          )}
        </View>
      )}
      
      {showArtwork && (
        <View style={[styles.artworkContainer, isActiveTrack && styles.activeArtworkContainer]}>
          <Image 
            source={{ uri: track.albumImageUrl }} 
            style={styles.artwork} 
            contentFit="cover"
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={`Album cover for ${track.albumName || track.name}`}
          />
        </View>
      )}
      
      <View style={styles.info}>
        <View style={styles.nameContainer}>
          <Text 
            style={[styles.name, isActiveTrack && styles.activeText]} 
            numberOfLines={1}
          >
            {track.name}
          </Text>
          {Platform.OS === 'web' && webPlayerReady && hasUri && (
            <Text style={styles.fullTrackTag}>Full Track</Text>
          )}
        </View>
        <Text 
          style={[styles.artist, isActiveTrack && styles.activeSubtext]} 
          numberOfLines={1}
        >
          {track.artists.join(", ")}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <Text style={[styles.duration, isActiveTrack && styles.activeText]}>
          {formatDuration(track.duration_ms)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'transparent',
  },
  activeContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  indexContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingAnimation: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 12,
    width: 16,
  },
  bar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
    marginRight: 1,
  },
  index: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  artworkContainer: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    marginRight: 12,
  },
  activeArtworkContainer: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  artwork: {
    width: 44,
    height: 44,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
    fontWeight: '500',
  },
  fullTrackTag: {
    fontSize: 10,
    color: Colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    fontWeight: '600',
  },
  artist: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: -0.1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  durationContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'right',
  },
  activeText: {
    color: '#9747FF', // A vibrant purple that's still accessible
  },
  activeSubtext: {
    color: '#9747FF',
    opacity: 0.75,
  },
});