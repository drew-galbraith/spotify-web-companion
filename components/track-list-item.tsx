import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
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
}

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
    openInSpotify,
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

  const handleOpenInSpotify = async (e: any) => {
    e.stopPropagation();
    if (track.uri) {
      await openInSpotify(track.uri);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isActiveTrack && styles.activeContainer]} 
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading && isActiveTrack}
    >
      {showIndex && index !== undefined && (
        <Text style={[styles.index, isActiveTrack && styles.activeText]}>
          {index + 1}
        </Text>
      )}
      
      {showArtwork && (
        <Image 
          source={{ uri: track.albumImageUrl }} 
          style={styles.artwork} 
          contentFit="cover"
        />
      )}
      
      <View style={styles.info}>
        <View style={styles.nameContainer}>
          <Text 
            style={[styles.name, isActiveTrack && styles.activeText]} 
            numberOfLines={1}
          >
            {track.name}
          </Text>
          {!isPlayable && (
            <Text style={styles.noPreviewTag}>
              {Platform.OS === 'web' ? "Not Playable" : "No Preview"}
            </Text>
          )}
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
      
      {isLoading && isActiveTrack ? (
        <ActivityIndicator size="small" color={Colors.primary} style={styles.duration} />
      ) : (
        <View style={styles.rightContainer}>
          {!isPlayable && Platform.OS !== 'web' && track.uri && (
            <TouchableOpacity 
              style={styles.spotifyButton} 
              onPress={handleOpenInSpotify}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <Text style={[styles.duration, isActiveTrack && styles.activeText]}>
            {formatDuration(track.duration_ms)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  activeContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  index: {
    width: 30,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  noPreviewTag: {
    fontSize: 10,
    color: Colors.error,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  fullTrackTag: {
    fontSize: 10,
    color: Colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  artist: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotifyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'Colors.primary', // Spotify green
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  duration: {
    fontSize: 14,
    color: Colors.textSecondary,
    width: 50,
    textAlign: 'right',
  },
  activeText: {
    color: Colors.primary,
  },
  activeSubtext: {
    color: Colors.primary,
    opacity: 0.8,
  },
});