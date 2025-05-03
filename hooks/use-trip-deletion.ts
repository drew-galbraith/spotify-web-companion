import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSpotifyApi } from './use-spotify-api';
import { db } from '../lib/firebase';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export function useTripDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const { fetchFromSpotify } = useSpotifyApi();

  // Delete a single playlist using Spotify API
  const deletePlaylist = async (playlistId: string) => {
    await fetchFromSpotify(`/playlists/${playlistId}/followers`, {
      method: 'DELETE'
    });
  };

  // Delete a single playlist
  const deletePlaylistFromTrip = useCallback(async (tripId: string, playlistId: string) => {
    try {
      setIsDeleting(true);
      setCurrentStep(`Deleting playlist from Spotify...`);
      
      // Delete from Spotify
      await deletePlaylist(playlistId);
      
      // Get trip data from Firebase
      const tripRef = doc(db, "trips", tripId);
      const tripDoc = await getDoc(tripRef);
      
      if (tripDoc.exists()) {
        const tripData = tripDoc.data();
        const updatedPlaylists = (tripData.playlists || []).filter(
          (p: any) => p.id !== playlistId
        );
        
        // Update trip in Firebase
        await updateDoc(tripRef, {
          playlists: updatedPlaylists,
          updatedAt: new Date().toISOString()
        });
      }
      
      setCurrentStep('Playlist deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    } finally {
      setIsDeleting(false);
      setProgress(0);
    }
  }, [fetchFromSpotify]);

  // Delete entire trip and all its playlists
  const deleteTrip = useCallback(async (tripId: string) => {
    try {
      setIsDeleting(true);
      
      // Get trip data from Firebase
      const tripRef = doc(db, "trips", tripId);
      const tripDoc = await getDoc(tripRef);
      
      if (!tripDoc.exists()) {
        throw new Error("Trip not found");
      }
      
      const tripData = tripDoc.data();
      const playlistIds = (tripData.playlists || []).map((playlist: any) => playlist.id);
      
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
      
      // Remove trip from Firebase
      setCurrentStep('Removing trip from your collection...');
      setProgress(90);
      await deleteDoc(tripRef);
      
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
  }, [fetchFromSpotify]);

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