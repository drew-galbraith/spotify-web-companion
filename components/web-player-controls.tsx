import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePlayerStore } from '../store/player-store';
import { useAuth } from '../context/auth-context';
import Colors from '../constants/colors';

export default function WebPlayerControls() {
  const { isPremium, isAuthenticated } = useAuth();
  const { 
    currentTrack, 
    isPlaying, 
    pauseTrack, 
    resumeTrack,
    webPlayerReady,
    webPlayerVisible,
    hideWebPlayer,
    toggleWebPlayerVisibility
  } = usePlayerStore();

  // Only show on web for premium users with a track when web player is visible
  if (Platform.OS !== 'web' || !isPremium || !isAuthenticated || !currentTrack || !webPlayerVisible) {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleClose = () => {
    hideWebPlayer();
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
      
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
      >
        <Ionicons name="close" size={20} color={Colors.text} />
      </TouchableOpacity>
      
      <Text style={styles.title}>Spotify Web Player</Text>
      
      {webPlayerReady ? (
        <View style={styles.content}>
          <Text style={styles.trackName} numberOfLines={1}>
            {currentTrack.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {currentTrack.artists.join(", ")}
          </Text>
          
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              {isPlaying ? (
                <Ionicons name="pause" size={24} color={Colors.text} />
              ) : (
                <Ionicons name="play" size={24} color={Colors.text} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="volume-high" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.statusText}>
            Playing full tracks with Spotify Premium
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.statusText}>
            Connecting to Spotify...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 150, // Position above mini player
    right: 20,
    width: 300,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
    zIndex: 1000,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1001,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
  },
  trackName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});