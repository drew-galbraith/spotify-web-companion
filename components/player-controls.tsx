
import React from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/player-store';

export interface PlayerControlsProps {
  compact?: boolean;
  showProgress?: boolean; // no-op for now
  onPlay?: () => void;
  onPause?: () => void | Promise<void>;
}

export default function PlayerControls({
  compact = false,
  showProgress = false,
  onPlay,
  onPause
}: PlayerControlsProps) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
  } = usePlayerStore();

  if (!currentTrack) {
    return null;
  }

  const handlePress = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {isLoading ? (
          <View style={styles.compactButton}>
            <ActivityIndicator size="small" color={Colors.text} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handlePress}
            disabled={isLoading}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={16}
              color={Colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.playButton}>
          <ActivityIndicator size="small" color={Colors.text} />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePress}
          disabled={isLoading}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={Colors.text}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
