import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useTripStore } from '../store/trip-store';
import { useSpotifyApi } from './use-spotify-api';

export function useTripDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const { deletePlaylist } = useSpotifyApi();
  const { removeTrip, getPlaylistIdsForTrip, removePlaylistFromTrip } = useTripStore();

  // Delete a single playlist
  const deletePlaylistFromTrip = useCallback(async (tripId: string, playlistId: string) => {
    try {
      setIsDeleting(true);
      setCurrentStep(`Deleting playlist from Spotify...`);
      
      // Delete from Spotify
      await deletePlaylist(playlistId);
      
      // Remove from trip store
      removePlaylistFromTrip(tripId, playlistId);
      
      setCurrentStep('Playlist deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    } finally {
      setIsDeleting(false);
      setProgress(0);
    }
  }, [deletePlaylist, removePlaylistFromTrip]);

  // Delete entire trip and all its playlists
  const deleteTrip = useCallback(async (tripId: string) => {
    try {
      setIsDeleting(true);
      
      // Get all playlist IDs for this trip
      const playlistIds = getPlaylistIdsForTrip(tripId);
      
      if (playlistIds.length > 0) {
        setCurrentStep(`Deleting ${playlistIds.length} playlists from Spotify...`);
        
        // Delete each playlist from Spotify
        for (let i = 0; i < playlistIds.length; i++) {
          const playlistId = playlistIds[i];
          setCurrentStep(`Deleting playlist ${i + 1} of ${playlistIds.length}...`);
          setProgress(Math.floor((i / playlistIds.length) * 100));
          
          try {
            await deletePlaylist(playlistId);
          } catch (error) {
            console.error(`Failed to delete playlist ${playlistId}:`, error);
            // Continue with other playlists even if one fails
          }
        }
      }
      
      // Remove trip from store
      setCurrentStep('Removing trip from your collection...');
      setProgress(90);
      removeTrip(tripId);
      
      setCurrentStep('Trip deleted successfully');
      setProgress(100);
      
      // Navigate back to trips list
      router.replace('/(tabs)/trips');
      
      return true;
    } catch (error) {
      console.error('Error deleting trip:', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [getPlaylistIdsForTrip, deletePlaylist, removeTrip]);

  // Confirm and delete trip
  const confirmAndDeleteTrip = useCallback((tripId: string, tripName: string) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${tripName || 'this trip'}" and all its playlists? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteTrip(tripId)
        }
      ]
    );
  }, [deleteTrip]);

  // Confirm and delete playlist
  const confirmAndDeletePlaylist = useCallback((tripId: string, playlistId: string, playlistName: string) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlistName}" from Spotify? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePlaylistFromTrip(tripId, playlistId)
        }
      ]
    );
  }, [deletePlaylistFromTrip]);

  return {
    isDeleting,
    progress,
    currentStep,
    deleteTrip,
    deletePlaylistFromTrip,
    confirmAndDeleteTrip,
    confirmAndDeletePlaylist
  };
}